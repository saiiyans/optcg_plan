"use client";

import { CardImage } from "@/components/CardImage";
import { getMaskRegion } from "@/lib/quizMaskConfig";
import type { QuizQuestion } from "@/lib/quizTypes";

/**
 * Carte affichée en grand pendant une question, avec la zone de texte
 * d'effet recouverte par un calque CSS (jamais une modification de
 * l'image elle-même — voir quizMaskConfig.ts). Le calque disparaît en
 * fondu une fois que le joueur a répondu (revealed=true), pour montrer le
 * vrai visuel complet pendant le feedback.
 */
export function QuizCardDisplay({
  question,
  revealed,
}: {
  question: QuizQuestion;
  revealed: boolean;
}) {
  const region = getMaskRegion(question.category, question.cardNumber);

  return (
    <div className="quiz-panel p-3 sm:p-4 flex flex-col items-center">
      <div className="relative w-full max-w-[260px] aspect-[5/7] rounded-xl overflow-hidden bg-[var(--quiz-panel2)]">
        <CardImage
          src={question.imageUrl}
          alt={question.name}
          fallbackLabel={question.cardNumber}
          sizes="260px"
          className="object-cover"
        />
        <div
          className={`quiz-mask ${revealed ? "is-revealed" : ""}`}
          style={{
            top: region.top,
            height: region.height,
            left: region.insetX,
            right: region.insetX,
          }}
          aria-hidden={revealed}
        >
          <span className="text-lg">🔒</span>
          <span className="text-[10px] font-semibold text-[var(--quiz-gold)]">Effet masqué</span>
        </div>
      </div>

      <div className="mt-3 w-full flex flex-wrap items-center justify-center gap-1.5 text-center">
        <span className="quiz-badge">{question.cardNumber}</span>
        <span className="quiz-badge">{question.category}</span>
        <span className="quiz-badge">{question.color}</span>
        {question.cost !== null && <span className="quiz-badge">Coût {question.cost}</span>}
        {question.power !== null && <span className="quiz-badge">{question.power} pts</span>}
      </div>
      <div className="mt-1.5 text-sm font-bold text-[var(--quiz-ivory)] text-center">{question.name}</div>
    </div>
  );
}
