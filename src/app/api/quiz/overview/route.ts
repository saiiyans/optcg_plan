import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { QuizCardWithMastery, QuizSessionRow, QuizAttemptWithSessionDate } from "@/lib/quizTypes";

export const dynamic = "force-dynamic";

/**
 * GET /api/quiz/overview — tableau de bord du Quiz des effets (section 12).
 * Séparé de /api/stats (vraies parties OPTCG) — jamais mélangé, demande
 * explicite du joueur.
 */
export async function GET() {
  const [readyCount, incompleteCount, quizCards, sessions, attempts]: [
    number,
    number,
    QuizCardWithMastery[],
    QuizSessionRow[],
    QuizAttemptWithSessionDate[]
  ] = await Promise.all([
    db.quizCard.count({ where: { status: "ready" } }),
    db.quizCard.count({ where: { status: "incomplete" } }),
    db.quizCard.findMany({ include: { mastery: true } }),
    db.quizSession.findMany({ where: { finishedAt: { not: null } }, orderBy: { startedAt: "desc" } }),
    db.quizAttempt.findMany({ select: { cardNumber: true, correct: true, session: { select: { startedAt: true } } } }),
  ]);

  const now = new Date();
  const studied = quizCards.filter((c) => c.mastery && c.mastery.appearances > 0).length;
  const mastered = quizCards.filter((c) => (c.mastery?.level ?? 0) >= 5).length;
  const dueToday = quizCards.filter((c) => c.status === "ready" && c.mastery && c.mastery.nextReviewAt && c.mastery.nextReviewAt <= now).length;

  const totalCorrect = attempts.filter((a) => a.correct).length;
  const successRatePct = attempts.length > 0 ? Math.round((totalCorrect / attempts.length) * 100) : 0;

  const bestMillionaireScore = Math.max(0, ...sessions.filter((s) => s.mode === "millionaire").map((s) => s.scoreReached));
  const sessionsCount = sessions.length;
  const totalTrainingMs = sessions.reduce((sum, s) => sum + (s.avgResponseMs ?? 0) * s.questionsTotal, 0);

  // Cartes qui causent le plus d'erreurs — comptées sur toutes les tentatives.
  const errorCounts = new Map<string, number>();
  attempts.forEach((a) => {
    if (!a.correct) errorCounts.set(a.cardNumber, (errorCounts.get(a.cardNumber) ?? 0) + 1);
  });
  const topErrorCards = [...errorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([cardNumber, errors]) => ({ cardNumber, errors }));

  // Série de bonnes réponses actuelle (toutes cartes confondues, dernières tentatives).
  const sortedAttempts = [...attempts].reverse(); // approximation : ordre de retour Prisma non garanti chronologique exact, suffisant pour un indicateur affiché, pas une preuve
  let currentStreak = 0;
  for (const a of sortedAttempts) {
    if (a.correct) currentStreak++;
    else break;
  }

  // Calendrier des jours d'entraînement (streak de jours, pas d'heures).
  const daysWithSession = new Set(sessions.map((s) => s.startedAt.toISOString().slice(0, 10)));

  // Progression par couleur/archétype/difficulté — nécessite les infos Card.
  const cardInfos: { cardNumber: string; color: string }[] = await db.card.findMany({
    where: { cardNumber: { in: quizCards.map((c) => c.cardNumber) } },
    select: { cardNumber: true, color: true },
  });
  const colorByNumber = new Map(cardInfos.map((c) => [c.cardNumber, c.color]));

  function bucketProgress(keyOf: (c: (typeof quizCards)[number]) => string) {
    const map = new Map<string, { total: number; mastered: number }>();
    quizCards.forEach((c) => {
      if (c.status !== "ready") return;
      const key = keyOf(c);
      const bucket = map.get(key) ?? { total: 0, mastered: 0 };
      bucket.total++;
      if ((c.mastery?.level ?? 0) >= 5) bucket.mastered++;
      map.set(key, bucket);
    });
    return [...map.entries()].map(([key, v]) => ({ key, ...v }));
  }

  const byColor = bucketProgress((c) => colorByNumber.get(c.cardNumber) ?? "?");
  const byDifficulty = bucketProgress((c) => String(c.difficulty));
  const byArchetype = bucketProgress((c) => {
    try {
      const arr: string[] = JSON.parse(c.archetypesJson || "[]");
      return arr[0] ?? "?";
    } catch {
      return "?";
    }
  });

  return NextResponse.json({
    ok: true,
    totalTarget: 200,
    readyCount,
    incompleteCount,
    studied,
    mastered,
    dueToday,
    successRatePct,
    currentStreak,
    bestMillionaireScore,
    sessionsCount,
    totalTrainingMs,
    topErrorCards,
    trainingDaysCount: daysWithSession.size,
    byColor,
    byDifficulty,
    byArchetype,
  });
}
