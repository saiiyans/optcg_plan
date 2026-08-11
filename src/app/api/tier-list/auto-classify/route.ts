import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import snapshot from "@/lib/data/onepiecetopdecks-tiers.json";

export const dynamic = "force-dynamic";

/**
 * POST /api/tier-list/auto-classify
 *
 * Applique l'instantané basé sur onepiecetopdecks.com (nombre réel de
 * decklists soumises par leader — voir sourceNote du fichier) à tous les
 * leaders qui n'ont pas déjà été corrigés à la main. Ne touche JAMAIS une
 * entrée marquée tierSource="manual".
 *
 * Les leaders sans numéro de carte confirmé (cardNumber: null dans
 * l'instantané — noms encore non vérifiés) reçoivent une clé synthétique
 * "CUSTOM-..." plutôt qu'un numéro de carte inventé, cohérent avec l'ajout
 * manuel côté interface.
 */
export async function POST() {
  let applied = 0;
  let skippedManual = 0;

  for (const e of snapshot.entries as any[]) {
    const key: string = e.cardNumber || `CUSTOM-${e.displayName.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}`;
    const existing = await db.leaderTierEntry.findUnique({ where: { cardNumber: key } });
    if (existing?.tierSource === "manual") {
      skippedManual++;
      continue;
    }
    await db.leaderTierEntry.upsert({
      where: { cardNumber: key },
      update: { tier: e.tier, displayName: e.displayName, color: e.color, tierSource: "auto" },
      create: { cardNumber: key, displayName: e.displayName, color: e.color, tier: e.tier, tierSource: "auto" },
    });
    applied++;
  }

  return NextResponse.json({
    ok: true,
    applied,
    skippedManual,
    sourceNote: snapshot.sourceNote,
    capturedAt: snapshot.capturedAt,
    format: snapshot.format,
  });
}
