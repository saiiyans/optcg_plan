import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildQuestion, millionaireDifficultyTier } from "@/lib/quizEngine";
import { selectMillionaireDeck, selectQuizCards, type TrainingFilters } from "@/lib/quizSelection";
import type { QuizCardRow, CardForQuiz } from "@/lib/quizTypes";

export const dynamic = "force-dynamic";

/**
 * POST /api/quiz/session
 * Body : { mode: "millionaire" } | { mode: "training", count, filters }
 *
 * Sélectionne les cartes (jamais de doublon dans la session, section 16),
 * construit les 4 options de CHAQUE question d'un coup (Fisher-Yates +
 * équilibrage de la distribution des bonnes réponses sur toute la partie,
 * voir buildQuestion() dans quizEngine.ts) et renvoie tout au client — le
 * client garde ensuite l'état de la partie en mémoire, sans autre aller-
 * retour serveur avant chaque réponse (voir POST /api/quiz/attempt).
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const mode: "millionaire" | "training" = body?.mode === "training" ? "training" : "millionaire";

  let cardNumbers: string[];
  let trainingFilterJson: string | null = null;

  if (mode === "millionaire") {
    cardNumbers = await selectMillionaireDeck();
    if (cardNumbers.length < 5) {
      return NextResponse.json(
        { ok: false, error: "Pas assez de cartes prêtes pour lancer une partie Millionnaire (voir /quiz/stats)." },
        { status: 400 }
      );
    }
  } else {
    const count = Math.min(Math.max(parseInt(body?.count ?? "10", 10) || 10, 1), 50);
    const filters: TrainingFilters = body?.filters ?? {};
    const picked = await selectQuizCards(count, filters);
    cardNumbers = picked.map((p) => p.cardNumber);
    trainingFilterJson = JSON.stringify(filters);
    if (cardNumbers.length === 0) {
      return NextResponse.json({ ok: false, error: "Aucune carte ne correspond à ces filtres." }, { status: 400 });
    }
  }

  const [quizCards, cards]: [QuizCardRow[], CardForQuiz[]] = await Promise.all([
    db.quizCard.findMany({ where: { cardNumber: { in: cardNumbers } } }),
    db.card.findMany({ where: { cardNumber: { in: cardNumbers } } }),
  ]);
  const quizByNumber = new Map(quizCards.map((q) => [q.cardNumber, q]));
  const cardByNumber = new Map(cards.map((c) => [c.cardNumber, c]));

  const letterUsageCount: [number, number, number, number] = [0, 0, 0, 0];
  const questions = cardNumbers.map((cardNumber, index) => {
    const quizCard = quizByNumber.get(cardNumber)!;
    const card = cardByNumber.get(cardNumber)!;
    const wrongAnswers = JSON.parse(quizCard.wrongAnswersJson || "[]") as string[];
    const correctText = card.officialTextFr || card.officialText || "";

    const built = buildQuestion(correctText, [wrongAnswers[0], wrongAnswers[1], wrongAnswers[2]], letterUsageCount);
    letterUsageCount[built.correctIndex]++;

    return {
      order: index + 1,
      cardNumber,
      name: card.name,
      category: card.category,
      color: card.color,
      cost: card.cost,
      power: card.power,
      counter: card.counter,
      attribute: card.attribute,
      types: card.types,
      imageUrl: card.localImagePath || card.imageUrl,
      officialText: card.officialText,
      officialTextFr: card.officialTextFr,
      triggerText: card.triggerText,
      explanationFr: quizCard.explanationFr,
      difficulty: quizCard.difficulty,
      difficultyTier: mode === "millionaire" ? millionaireDifficultyTier(index) : quizCard.difficulty,
      options: built.options.map((o) => o.text),
      correctIndex: built.correctIndex,
    };
  });

  const session = await db.quizSession.create({
    data: {
      mode,
      questionsTotal: questions.length,
      trainingFilterJson,
    },
  });

  return NextResponse.json({ ok: true, sessionId: session.id, mode, questions });
}
