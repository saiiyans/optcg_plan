import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { COACH_SEED } from "@/lib/coachSeed";

export async function POST() {
  let updated = 0;
  const skipped: string[] = [];

  for (const [cardNumber, entry] of Object.entries(COACH_SEED)) {
    const card = await db.card.findUnique({ where: { cardNumber } });
    if (!card) {
      skipped.push(cardNumber);
      continue;
    }
    await db.card.update({
      where: { cardNumber },
      data: {
        coachReviewed: true,
        coachExplanationEn: entry.coachExplanationEn,
        coachExplanationFr: entry.coachExplanationFr,
        mihawkAnalysisFr: entry.mihawkAnalysisFr,
        mihawkPros: JSON.stringify(entry.mihawkPros),
        mihawkCons: JSON.stringify(entry.mihawkCons),
        mihawkSynergies: JSON.stringify(entry.mihawkSynergies),
        mihawkCommonUse: entry.mihawkCommonUse,
        mihawkCommonMistake: entry.mihawkCommonMistake,
      },
    });
    updated++;
  }

  return NextResponse.json({
    ok: true,
    updated,
    skipped,
    note: skipped.length > 0 ? `${skipped.length} carte(s) pas encore importée(s) dans la Bibliothèque, donc ignorée(s) : ${skipped.join(", ")}. Importe-les d'abord puis relance ce bouton.` : undefined,
  });
}
