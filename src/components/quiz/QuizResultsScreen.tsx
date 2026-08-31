"use client";

import Link from "next/link";

export interface QuizSessionSummary {
  session: {
    mode: string;
    questionsTotal: number;
    questionsCorrect: number;
    successRatePct: number;
    avgResponseMs: number | null;
    scoreReached: number;
  };
  masteredCardNumbers: string[];
  toReviewCardNumbers: string[];
}

/** Écran de fin de partie (section 7/9 du cahier des charges) — jamais juste un score brut : détail complet + actions pour enchaîner. */
export function QuizResultsScreen({
  summary,
  endedByError,
  onReplay,
}: {
  summary: QuizSessionSummary;
  endedByError?: boolean;
  onReplay: () => void;
}) {
  const { session, masteredCardNumbers, toReviewCardNumbers } = summary;
  const avgSeconds = session.avgResponseMs ? (session.avgResponseMs / 1000).toFixed(1) : null;

  return (
    <div className="quiz-panel p-5 sm:p-6 space-y-5 max-w-lg mx-auto">
      <div className="text-center">
        <div className="quiz-eyebrow">{session.mode === "millionaire" ? "Mode Millionnaire — Résultat" : "Entraînement — Résultat"}</div>
        {session.mode === "millionaire" && (
          <div className="mt-2 text-3xl font-extrabold quiz-gold-text">
            {session.scoreReached.toLocaleString("fr-FR")} pts
          </div>
        )}
        {endedByError && <div className="text-xs text-[var(--quiz-danger)] mt-1">Partie terminée sur une mauvaise réponse.</div>}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="quiz-panel2 p-3">
          <div className="text-lg font-bold text-[var(--quiz-ivory)]">
            {session.questionsCorrect}/{session.questionsTotal}
          </div>
          <div className="text-[10px] text-[var(--quiz-steel)] mt-0.5">Bonnes réponses</div>
        </div>
        <div className="quiz-panel2 p-3">
          <div className="text-lg font-bold text-[var(--quiz-ivory)]">{session.successRatePct}%</div>
          <div className="text-[10px] text-[var(--quiz-steel)] mt-0.5">Précision</div>
        </div>
        <div className="quiz-panel2 p-3">
          <div className="text-lg font-bold text-[var(--quiz-ivory)]">{avgSeconds ? `${avgSeconds}s` : "—"}</div>
          <div className="text-[10px] text-[var(--quiz-steel)] mt-0.5">Temps moyen</div>
        </div>
      </div>

      {masteredCardNumbers.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-[var(--quiz-emerald)] mb-1.5">
            ⭐ {masteredCardNumbers.length} carte(s) maîtrisée(s) cette partie
          </div>
          <div className="flex flex-wrap gap-1">
            {masteredCardNumbers.map((c) => (
              <span key={c} className="quiz-badge">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {toReviewCardNumbers.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-[var(--quiz-danger)] mb-1.5">
            📌 {toReviewCardNumbers.length} carte(s) à revoir
          </div>
          <div className="flex flex-wrap gap-1">
            {toReviewCardNumbers.map((c) => (
              <span key={c} className="quiz-badge">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
        <button onClick={onReplay} className="quiz-btn quiz-btn-gold">
          Rejouer
        </button>
        {toReviewCardNumbers.length > 0 ? (
          <Link href="/quiz/training?scope=mistakes" className="quiz-btn text-center">
            Réviser les erreurs
          </Link>
        ) : (
          <Link href="/quiz" className="quiz-btn text-center">
            Retour à l'accueil du quiz
          </Link>
        )}
      </div>
    </div>
  );
}
