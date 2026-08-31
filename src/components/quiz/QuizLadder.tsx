"use client";

import { MILLIONAIRE_LADDER, isSafeHaven } from "@/lib/quizEngine";

/** Échelle des gains du mode Millionnaire — palier atteint en or, paliers déjà passés en vert, paliers "sécurisés" (5e et 10e) cerclés en pointillés. Affichée du plus haut au plus bas, comme dans le genre. */
export function QuizLadder({ currentIndex }: { currentIndex: number }) {
  return (
    <div className="quiz-panel p-3 space-y-0.5">
      <div className="quiz-eyebrow mb-1.5">Échelle des gains</div>
      {MILLIONAIRE_LADDER.map((amount, i) => {
        const reversedIdx = MILLIONAIRE_LADDER.length - 1 - i;
        const isCurrent = reversedIdx === currentIndex;
        const isPast = reversedIdx < currentIndex;
        const safe = isSafeHaven(reversedIdx);
        return (
          <div
            key={reversedIdx}
            className={`quiz-ladder-step ${isCurrent ? "is-current" : ""} ${isPast ? "is-past" : ""} ${safe ? "is-safe" : ""}`}
          >
            <span>
              {reversedIdx + 1}. {safe ? "🔒 " : ""}
            </span>
            <span>{amount.toLocaleString("fr-FR")}</span>
          </div>
        );
      })}
    </div>
  );
}
