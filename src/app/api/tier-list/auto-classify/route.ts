import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import snapshot from "@/lib/data/onepiecetopdecks-tiers.json";

export const dynamic = "force-dynamic";

/**
 * POST /api/tier-list/auto-classify
 *
 * Applique l'instantané basé sur onepiecetopdecks.com (fréquence des
 * decklists soumises — voir sourceNote du fichier) à tous les leaders qui
 * n'ont pas déjà été corrigés à la main. Ne touche JAMAIS une entrée
 * marquée tierSource="manual" — une correction humaine n'est jamais
 * écrasée par le classement automatique.
 */
export async function POST() {
  let applied = 0;
  let skippedManual = 0;

  for (const e of snapshot.entries) {
    const existing = await db.leaderTierEntry.findUnique({ where: { cardNumber: e.cardNumber } });
    if (existing?.tierSource === "manual") {
      skippedManual++;
      continue;
    }
    await db.leaderTierEntry.upsert({
      where: { cardNumber: e.cardNumber },
      update: { tier: e.tier, displayName: e.displayName, color: e.color, tierSource: "auto" },
      create: { cardNumber: e.cardNumber, displayName: e.displayName, color: e.color, tier: e.tier, tierSource: "auto" },
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
