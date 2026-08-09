import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveOpponentLeaderId } from "@/lib/leaderNormalization";

export const dynamic = "force-dynamic";

/**
 * GET /api/opponent-leaders
 * Liste les leaders normalisés, avec le nombre de parties et les
 * variantes brutes regroupées sous chacun — pour l'interface de fusion.
 *
 * POST /api/opponent-leaders/backfill  (voir route backfill séparée)
 */
export async function GET() {
  const leaders = await db.opponentLeader.findMany({
    include: { _count: { select: { matches: true } } },
    orderBy: { displayName: "asc" },
  });
  return NextResponse.json({
    ok: true,
    leaders: leaders.map((l) => ({
      id: l.id,
      displayName: l.displayName,
      rawNames: JSON.parse(l.rawNames || "[]"),
      matchCount: l._count.matches,
    })),
  });
}

/**
 * PATCH /api/opponent-leaders  { sourceId, targetId }
 * Fusionne sourceId dans targetId : toutes les parties de sourceId sont
 * réassignées à targetId (jamais supprimées), les variantes de nom brut
 * sont fusionnées, puis sourceId est supprimé. Ne touche à aucun texte
 * brut de Match.opponentLeader, seulement au lien de regroupement.
 */
export async function PATCH(req: NextRequest) {
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

  const [, updated] = await Promise.all([
    db.opponentLeader.update({ where: { id: targetId }, data: { rawNames: JSON.stringify(mergedNames) } }),
    db.match.updateMany({ where: { opponentLeaderId: sourceId }, data: { opponentLeaderId: targetId } }),
  ]);
  await db.opponentLeader.delete({ where: { id: sourceId } });

  return NextResponse.json({ ok: true, reassignedMatches: updated.count });
}
