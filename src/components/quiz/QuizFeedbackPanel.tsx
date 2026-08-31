"use client";

import type { QuizQuestion } from "@/lib/quizTypes";
import type { QuizLanguage } from "@/components/quiz/QuizLanguageToggle";

/**
 * Panneau affiché après la réponse : verdict, effet officiel complet
 * (langue choisie par le joueur), explication stratégique. Reste affiché
 * tant que le joueur n'a pas cliqué "Question suivante" (jamais d'avancée
 * automatique).
 *
 * Note honnête sur la langue (voir QuizLanguageToggle) : les 3 mauvaises
 * réponses ne sont générées qu'en français par la route quiz-build — donc
 * les 4 options de réponse restent toujours en français quel que soit le
 * mode choisi ici. Le sélecteur de langue ne change que le texte d'effet
 * officiel COMPLET affiché dans ce panneau de correction, où l'anglais et
 * le français réels (Card.officialText / officialTextFr) sont
 * disponibles.
 */
export function QuizFeedbackPanel({
  question,
  wasCorrect,
  language,
  onNext,
  nextLabel = "Question suivante",
}: {
  question: QuizQuestion;
  wasCorrect: boolean;
  language: QuizLanguage;
  onNext: () => void;
  nextLabel?: string;
}) {
  const showEn = language === "en" || language === "bilingue";
  const showFr = language === "fr" || language === "bilingue";

  return (
    <div className="quiz-panel2 p-4 space-y-3">
      <div className={`text-sm font-bold ${wasCorrect ? "text-[var(--quiz-emerald)]" : "text-[var(--quiz-danger)]"}`}>
        {wasCorrect ? "✓ Bonne réponse" : "✗ Pas le bon effet"}
      </div>

      <div className="space-y-2">
        {showEn && question.officialText && (
          <p className="text-xs text-[var(--quiz-steel)] leading-relaxed">
            <span className="quiz-badge mr-1.5 align-middle">EN</span>
            {question.officialText}
          </p>
        )}
        {showFr && question.officialTextFr && (
          <p className="text-xs text-[var(--quiz-ivory)] leading-relaxed">
            <span className="quiz-badge quiz-badge-gold mr-1.5 align-middle">FR</span>
            {question.officialTextFr}
          </p>
        )}
        {question.triggerText && (
          <p className="text-xs text-[var(--quiz-gold)] leading-relaxed">
            <span className="font-semibold">Trigger :</span> {question.triggerText}
          </p>
        )}
      </div>

      {question.explanationFr && (
        <p className="text-xs text-[var(--quiz-steel)] leading-relaxed border-t border-[var(--quiz-line)] pt-2.5">
          💡 {question.explanationFr}
        </p>
      )}

      <button onClick={onNext} className="quiz-btn quiz-btn-gold w-full mt-1">
        {nextLabel}
      </button>
    </div>
  );
}
