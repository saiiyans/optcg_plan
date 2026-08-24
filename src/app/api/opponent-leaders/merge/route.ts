import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/opponent-leaders/merge { sourceId, targetId }
 *
 * Fusionne `sourceId` DANS `targetId` (section 11 — outil de fusion) :
 * - toutes les parties liées à sourceId basculent sur targetId (le texte
 *   brut Match.opponentLeader n'est JAMAIS modifié, seul opponentLeaderId change) ;
 * - les variantes de texte brut de sourceId sont ajoutées à targetId (rien
 *   n'est perdu — "préservation du texte original" de la section 11) ;
 * - sourceId est ensuite supprimé.
 *
 * Toujours déclenché manuellement depuis l'outil de revue — jamais appelé
 * automatiquement, conformément à la règle "cas ambigus -> revue manuelle".
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { sourceId, targetId } = body;
  if (!sourceId || !targetId || sourceId === targetId) {
    return NextResponse.json({ ok: false, error: "sourceId et targetId requis et différents." }, { status: 400 });
  }

  const [source, target] = await Promise.all([
    db.opponentLeader.findUnique({ where: { id: sourceId } }),
    db.opponentLeader.findUnique({ where: { id: targetId } }),
  ]);
  if (!source || !target) {
    return NextResponse.json({ ok: false, error: "Leader introuvable." }, { status: 404 });
  }

  const sourceNames: string[] = JSON.parse(source.rawNames || "[]");
  const targetNames: string[] = JSON.parse(target.rawNames || "[]");
  const mergedNames = Array.from(new Set([...targetNames, ...sourceNames]));

  const [, updated] = await db.$transaction([
    db.match.updateMany({ where: { opponentLeaderId: sourceId }, data: { opponentLeaderId: targetId } }),
    db.opponentLeader.update({ where: { id: targetId }, data: { rawNames: JSON.stringify(mergedNames) } }),
  ]);
  await db.opponentLeader.delete({ where: { id: sourceId } });

  return NextResponse.json({ ok: true, target: updated });
}
