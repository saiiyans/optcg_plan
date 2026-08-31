import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildQuestion } from "@/lib/quizEngine";
import { selectQuizCards } from "@/lib/quizSelection";

export const dynamic = "force-dynamic";

/**
 * POST /api/quiz/joker  { excludeCardNumbers: string[], difficulty?: 1|2|3, order: number }
 *
 * Joker "Changer de carte" (section 8) : remplace la question actuelle par
 * une autre de difficulté équivalente, jamais déjà vue dans cette session
 * (excludeCardNumbers) — la carte remplacée n'est jamais comptée comme une
 * erreur (aucune QuizAttempt n'est créée ici, c'est au client de ne pas en
 * enregistrer pour la carte abandonnée).
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const excludeCardNumbers: string[] = Array.isArray(body?.excludeCardNumbers) ? body.excludeCardNumbers : [];
  const difficulty: 1 | 2 | 3 | undefined = [1, 2, 3].includes(body?.difficulty) ? body.difficulty : undefined;
  const order: number = typeof body?.order === "number" ? body.order : 1;

  let picked = await selectQuizCards(1, { difficulty }, excludeCardNumbers);
  if (picked.length === 0) picked = await selectQuizCards(1, {}, excludeCardNumbers);
  if (picked.length === 0) {
    return NextResponse.json({ ok: false, error: "Plus aucune carte disponible pour remplacer celle-ci." }, { status: 400 });
  }

  const cardNumber = picked[0].cardNumber;
  const [quizCard, card] = await Promise.all([
    db.quizCard.findUnique({ where: { cardNumber } }),
    db.card.findUnique({ where: { cardNumber } }),
  ]);
  if (!quizCard || !card) {
    return NextResponse.json({ ok: false, error: "Carte de remplacement introuvable." }, { status: 404 });
  }

  const wrongAnswers = JSON.parse(quizCard.wrongAnswersJson || "[]") as string[];
  const correctText = card.officialTextFr || card.officialText || "";
  const built = buildQuestion(correctText, [wrongAnswers[0], wrongAnswers[1], wrongAnswers[2]]);

  return NextResponse.json({
    ok: true,
    question: {
      order,
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
      difficultyTier: quizCard.difficulty,
      options: built.options.map((o) => o.text),
      correctIndex: built.correctIndex,
    },
  });
}
