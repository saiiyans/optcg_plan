import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { analyzeDefeat, parseMatchTags } from "@/lib/defeatAnalysis";

export const dynamic = "force-dynamic";

/**
 * POST /api/matches/:id/analyze — (re)génère l'analyse du coach pour une
 * défaite. Crée TOUJOURS une nouvelle ligne CoachInsight (jamais un
 * update en place) : l'historique des analyses précédentes reste
 * consultable, et Match.lossReason n'est jamais touché ici — voir
 * src/lib/defeatAnalysis.ts et la règle "aucune fabrication" du projet.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const match = await db.match.findUnique({ where: { id: params.id } });
  if (!match) return NextResponse.json({ ok: false, error: "Partie introuvable." }, { status: 404 });
  if (match.result !== "Défaite") {
    return NextResponse.json({ ok: false, error: "L'analyse du coach n'est générée que pour les défaites." }, { status: 400 });
  }

  const analysis = analyzeDefeat({
    opponentLeader: match.opponentLeader,
    myDeck: match.myDeck,
    turnOrder: match.turnOrder,
    mulligan: match.mulligan,
    openingHandQuality: match.openingHandQuality,
    keyTurn: match.keyTurn,
    decisiveMoment: match.decisiveMoment,
    boardStateAtCritical: match.boardStateAtCritical,
    myLifeRemaining: match.myLifeRemaining,
    opponentLifeRemaining: match.opponentLifeRemaining,
    cardsInHandEnd: match.cardsInHandEnd,
    donRecoveredUnused: match.donRecoveredUnused,
    gameDurationMinutes: match.gameDurationMinutes,
    lossReason: match.lossReason,
    whatCouldHaveDoneDifferently: match.whatCouldHaveDoneDifferently,
    tags: parseMatchTags(match),
  });

  const insight = await db.coachInsight.create({
    data: {
      matchId: match.id,
      kind: "post_match_defeat",
      mainCause: analysis.mainCause,
      secondaryCauses: JSON.stringify(analysis.secondaryCauses),
      criticalMoment: analysis.criticalMoment,
      technicalTerm: analysis.technicalTerm,
      bestLine: analysis.bestLine,
      bestLineIsHypothesis: analysis.bestLineIsHypothesis,
      lessonFr: analysis.lessonFr,
      exerciseNext: analysis.exerciseNext,
      confidenceLevel: analysis.confidenceLevel,
      missingInfoQuestions: JSON.stringify(analysis.missingInfoQuestions),
      classification: analysis.classification,
      classificationSecondary: JSON.stringify(analysis.classificationSecondary),
      fundamentalsFlagged: JSON.stringify(analysis.fundamentalsFlagged.map((f) => f.id)),
    },
  });

  return NextResponse.json({ ok: true, insight });
}
