import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { updateMastery, type MasteryState } from "@/lib/quizSpacedRepetition";

export const dynamic = "force-dynamic";

/**
 * POST /api/quiz/attempt
 * Body : { sessionId, cardNumber, selectedIndex, correctIndex, responseMs?, jokerUsed?, questionOrder }
 *
 * Enregistre la réponse ET met à jour la maîtrise/répétition espacée de la
 * carte (section 11) dans le même appel — jamais de double écriture
 * séparée qui pourrait désynchroniser les deux. Empêche un double-clic de
 * compter deux fois la même question (section 16) : si une QuizAttempt
 * existe déjà pour (sessionId, cardNumber, questionOrder), elle est
 * renvoyée telle quelle plutôt que dupliquée ou recomptée dans la maîtrise.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { sessionId, cardNumber, selectedIndex, correctIndex, responseMs, jokerUsed, questionOrder } = body ?? {};

  if (!sessionId || !cardNumber || typeof selectedIndex !== "number" || typeof correctIndex !== "number" || typeof questionOrder !== "number") {
    return NextResponse.json({ ok: false, error: "Corps invalide." }, { status: 400 });
  }

  const already = await db.quizAttempt.findFirst({ where: { sessionId, cardNumber, questionOrder } });
  if (already) {
    return NextResponse.json({ ok: true, alreadyRecorded: true });
  }

  const correct = selectedIndex === correctIndex;

  const quizCard = await db.quizCard.findUnique({ where: { cardNumber }, include: { mastery: true } });
  if (!quizCard) return NextResponse.json({ ok: false, error: "Carte de quiz introuvable." }, { status: 404 });

  await db.quizAttempt.create({
    data: { sessionId, cardNumber, correct, selectedIndex, correctIndex, responseMs: responseMs ?? null, jokerUsed: jokerUsed ?? null, questionOrder },
  });

  const state: MasteryState = quizCard.mastery
    ? {
        level: quizCard.mastery.level,
        currentStreak: quizCard.mastery.currentStreak,
        bestStreak: quizCard.mastery.bestStreak,
        appearances: quizCard.mastery.appearances,
        correct: quizCard.mastery.correct,
        incorrect: quizCard.mastery.incorrect,
      }
    : { level: 0, currentStreak: 0, bestStreak: 0, appearances: 0, correct: 0, incorrect: 0 };

  const updated = updateMastery(state, correct);

  const prevAvg = quizCard.mastery?.avgResponseMs ?? null;
  const prevAppearances = quizCard.mastery?.appearances ?? 0;
  const avgResponseMs =
    typeof responseMs === "number"
      ? prevAvg != null
        ? Math.round((prevAvg * prevAppearances + responseMs) / (prevAppearances + 1))
        : responseMs
      : prevAvg;

  const wrongPicked: string[] = quizCard.mastery ? JSON.parse(quizCard.mastery.wrongAnswersPickedJson || "[]") : [];
  if (!correct) {
    const wrongOptions = JSON.parse(quizCard.wrongAnswersJson || "[]") as string[];
    const pickedText = wrongOptions[selectedIndex] ?? null;
    if (pickedText) wrongPicked.push(pickedText);
  }

  await db.quizMastery.upsert({
    where: { quizCardId: quizCard.id },
    update: {
      level: updated.level,
      appearances: updated.appearances,
      correct: updated.correct,
      incorrect: updated.incorrect,
      currentStreak: updated.currentStreak,
      bestStreak: updated.bestStreak,
      avgResponseMs,
      lastReviewedAt: new Date(),
      nextReviewAt: updated.nextReviewAt,
      wrongAnswersPickedJson: JSON.stringify(wrongPicked.slice(-20)),
    },
    create: {
      quizCardId: quizCard.id,
      level: updated.level,
      appearances: updated.appearances,
      correct: updated.correct,
      incorrect: updated.incorrect,
      currentStreak: updated.currentStreak,
      bestStreak: updated.bestStreak,
      avgResponseMs,
      lastReviewedAt: new Date(),
      nextReviewAt: updated.nextReviewAt,
      wrongAnswersPickedJson: JSON.stringify(wrongPicked),
    },
  });

  return NextResponse.json({
    ok: true,
    correct,
    mastery: { level: updated.level, nextReviewAt: updated.nextReviewAt },
  });
}
