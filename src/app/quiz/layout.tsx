import "./quiz-theme.css";

// Toutes les pages /quiz/** partagent une identité visuelle "bleu nuit +
// or" volontairement différente du reste de l'app (demande explicite du
// cahier des charges du 31/08/2026, section direction artistique) — voir
// quiz-theme.css pour le détail et pourquoi ça reste scopé (classe
// .quiz-theme) plutôt que de toucher globals.css.
export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return <div className="quiz-theme -mx-4 sm:-mx-6 px-4 sm:px-6 py-5 sm:py-6">{children}</div>;
}
