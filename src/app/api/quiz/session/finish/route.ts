import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { QuizAttemptRow, QuizCardWithMastery } from "@/lib/quizTypes";

export const dynamic = "force-dynamic";

/**
 * POST /api/quiz/session/finish
 * Body : { sessionId, scoreReached?, endedByError?, jokersUsed? }
 *
 * Clôture une session — calcule les totaux depuis les QuizAttempt déjà
 * enregistrées (jamais recomptés côté client, pour rester fiable même si
 * l'app a été fermée/rouverte en cours de partie) et renvoie le résumé de
 * fin (section 7) : score, bonnes réponses, %, temps moyen, cartes
 * maîtrisées/à revoir de CETTE session.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const sessionId: string | undefined = body?.sessionId;
  if (!sessionId) return NextResponse.json({ ok: false, error: "sessionId requis." }, { status: 400 });

  const attempts: QuizAttemptRow[] = await db.quizAttempt.findMany({ where: { sessionId }, orderBy: { questionOrder: "asc" } });
  const questionsCorrect = attempts.filter((a) => a.correct).length;
  const responseTimes = attempts.map((a) => a.responseMs).filter((t): t is number => typeof t === "number");
  const avgResponseMs = responseTimes.length > 0 ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : null;

  const session = await db.quizSession.update({
    where: { id: sessionId },
    data: {
      finishedAt: new Date(),
      questionsCorrect,
      avgResponseMs,
      scoreReached: body?.scoreReached ?? 0,
      endedByError: !!body?.endedByError,
      jokersUsedJson: body?.jokersUsed ? JSON.stringify(body.jokersUsed) : undefined,
    },
  });

  const cardNumbers = [...new Set(attempts.map((a) => a.cardNumber))];
  const masteries: QuizCardWithMastery[] = await db.quizCard.findMany({
    where: { cardNumber: { in: cardNumbers } },
    include: { mastery: true },
  });
  const mastered = masteries.filter((m) => (m.mastery?.level ?? 0) >= 5).map((m) => m.cardNumber);
  const toReview = attempts.filter((a) => !a.correct).map((a) => a.cardNumber);

  return NextResponse.json({
    ok: true,
    session: {
      id: session.id,
      mode: session.mode,
      questionsTotal: session.questionsTotal,
      questionsCorrect,
      successRatePct: session.questionsTotal > 0 ? Math.round((questionsCorrect / session.questionsTotal) * 100) : 0,
      avgResponseMs,
      scoreReached: session.scoreReached,
    },
    masteredCardNumbers: mastered,
    toReviewCardNumbers: [...new Set(toReview)],
  });
}
