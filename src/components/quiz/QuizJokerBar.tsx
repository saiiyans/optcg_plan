"use client";

export interface JokerState {
  fiftyFifty: boolean; // true = déjà utilisé
  hint: boolean;
  changeCard: boolean;
}

const JOKERS: { key: keyof JokerState; icon: string; label: string }[] = [
  { key: "fiftyFifty", icon: "➗", label: "50/50" },
  { key: "hint", icon: "🧭", label: "Indice Coach" },
  { key: "changeCard", icon: "🔄", label: "Changer de carte" },
];

/** Barre des 3 jokers (section 8 du cahier des charges) — chacun utilisable une seule fois par partie, jamais pendant que la question est déjà répondue. */
export function QuizJokerBar({
  used,
  disabled,
  onUse,
}: {
  used: JokerState;
  disabled: boolean;
  onUse: (joker: keyof JokerState) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {JOKERS.map((j) => (
        <button
          key={j.key}
          type="button"
          disabled={disabled || used[j.key]}
          onClick={() => onUse(j.key)}
          className="quiz-btn flex items-center gap-1.5 !py-2 !px-3"
          title={j.label}
        >
          <span>{j.icon}</span>
          <span className="text-xs">{j.label}</span>
          {used[j.key] && <span className="text-[10px] text-[var(--quiz-danger)]">utilisé</span>}
        </button>
      ))}
    </div>
  );
}
