"use client";

const LETTERS = ["A", "B", "C", "D"];

/**
 * 4 boutons de réponse. Ne déclenche JAMAIS l'avancée automatique à la
 * question suivante (demande explicite du cahier des charges) : une fois
 * `selectedIndex` non-null, les 4 boutons affichent leur état final
 * (correcte en vert, la réponse choisie en rouge si fausse, les 2 autres
 * neutres) et restent affichés jusqu'à ce que l'appelant avance lui-même.
 */
export function QuizAnswerButtons({
  options,
  correctIndex,
  selectedIndex,
  eliminatedIndexes = [],
  onSelect,
}: {
  options: string[];
  correctIndex: number;
  selectedIndex: number | null;
  eliminatedIndexes?: number[];
  onSelect: (index: number) => void;
}) {
  const answered = selectedIndex !== null;

  return (
    <div className="space-y-2.5">
      {options.map((text, i) => {
        const isEliminated = eliminatedIndexes.includes(i);
        let stateClass = "";
        if (answered) {
          if (i === correctIndex) stateClass = "is-correct";
          else if (i === selectedIndex) stateClass = "is-wrong";
          else stateClass = "is-faded";
        } else if (isEliminated) {
          stateClass = "is-eliminated";
        }

        return (
          <button
            key={i}
            type="button"
            disabled={answered || isEliminated}
            onClick={() => onSelect(i)}
            className={`quiz-answer ${stateClass}`}
          >
            <span className="quiz-answer-letter">{LETTERS[i]}</span>
            <span className="flex-1">{text}</span>
            {answered && i === correctIndex && <span className="text-lg">✓</span>}
            {answered && i === selectedIndex && i !== correctIndex && <span className="text-lg">✗</span>}
          </button>
        );
      })}
    </div>
  );
}
