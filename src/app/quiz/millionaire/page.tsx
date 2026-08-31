"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { QuizCardDisplay } from "@/components/quiz/QuizCardDisplay";
import { QuizAnswerButtons } from "@/components/quiz/QuizAnswerButtons";
import { QuizFeedbackPanel } from "@/components/quiz/QuizFeedbackPanel";
import { QuizJokerBar, type JokerState } from "@/components/quiz/QuizJokerBar";
import { QuizLadder } from "@/components/quiz/QuizLadder";
import { QuizResultsScreen, type QuizSessionSummary } from "@/components/quiz/QuizResultsScreen";
import { QuizLanguageToggle, readStoredQuizLanguage, type QuizLanguage } from "@/components/quiz/QuizLanguageToggle";
import { guaranteedScore, MILLIONAIRE_LADDER } from "@/lib/quizEngine";
import type { QuizQuestion } from "@/lib/quizTypes";

type Phase = "loading" | "error" | "playing" | "answered" | "finished";

const EMPTY_JOKERS: JokerState = { fiftyFifty: false, hint: false, changeCard: false };

export default function MillionairePage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [wasCorrect, setWasCorrect] = useState(false);
  const [jokers, setJokers] = useState<JokerState>(EMPTY_JOKERS);
  const [eliminated, setEliminated] = useState<number[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [changingCard, setChangingCard] = useState(false);
  const [questionShownAt, setQuestionShownAt] = useState<number>(Date.now());
  const [summary, setSummary] = useState<QuizSessionSummary | null>(null);
  const [endedByError, setEndedByError] = useState(false);
  const [language, setLanguage] = useState<QuizLanguage>("fr");
  const [jokerUsedThisQuestion, setJokerUsedThisQuestion] = useState<string | null>(null);

  useEffect(() => {
    setLanguage(readStoredQuizLanguage());
  }, []);

  const startGame = useCallback(() => {
    setPhase("loading");
    setIndex(0);
    setSelectedIndex(null);
    setJokers(EMPTY_JOKERS);
    setEliminated([]);
    setShowHint(false);
    setSummary(null);
    setEndedByError(false);
    setJokerUsedThisQuestion(null);
    fetch("/api/quiz/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "millionaire" }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) {
          setErrorMsg(data.error ?? "Impossible de démarrer la partie.");
          setPhase("error");
          return;
        }
        setSessionId(data.sessionId);
        setQuestions(data.questions);
        setQuestionShownAt(Date.now());
        setPhase("playing");
      })
      .catch(() => {
        setErrorMsg("Erreur réseau — réessaie dans un instant.");
        setPhase("error");
      });
  }, []);

  useEffect(() => {
    startGame();
  }, [startGame]);

  const question = questions[index];

  async function finishSession(scoreReached: number, byError: boolean) {
    if (!sessionId) return;
    const res = await fetch("/api/quiz/session/finish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        scoreReached,
        endedByError: byError,
        jokersUsed: Object.entries(jokers)
          .filter(([, used]) => used)
          .map(([k]) => k),
      }),
    });
    const data = await res.json();
    if (data.ok) {
      setSummary(data);
      setEndedByError(byError);
      setPhase("finished");
    }
  }

  async function selectAnswer(i: number) {
    if (!question || selectedIndex !== null) return;
    setSelectedIndex(i);
    const correct = i === question.correctIndex;
    setWasCorrect(correct);
    setPhase("answered");

    await fetch("/api/quiz/attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        cardNumber: question.cardNumber,
        selectedIndex: i,
        correctIndex: question.correctIndex,
        responseMs: Date.now() - questionShownAt,
        jokerUsed: jokerUsedThisQuestion,
        questionOrder: question.order,
      }),
    }).catch(() => {});
    // Ne JAMAIS enchaîner automatiquement vers l'écran de résultat ici,
    // même en cas d'erreur (section 16 : jamais d'avancée automatique) —
    // le joueur doit d'abord voir le panneau de correction (effet réel +
    // explication) et cliquer lui-même sur "Voir le résultat final"
    // (géré par nextQuestion(), plus bas, qui sait terminer la partie
    // quand la dernière réponse était fausse).
  }

  function nextQuestion() {
    if (!wasCorrect) {
      // Une erreur termine la partie (section 7) — score garanti = dernier palier sécurisé franchi.
      finishSession(guaranteedScore(index), true);
      return;
    }
    if (index + 1 >= questions.length) {
      finishSession(MILLIONAIRE_LADDER[MILLIONAIRE_LADDER.length - 1], false);
      return;
    }
    setIndex((i) => i + 1);
    setSelectedIndex(null);
    setEliminated([]);
    setShowHint(false);
    setJokerUsedThisQuestion(null);
    setQuestionShownAt(Date.now());
    setPhase("playing");
  }

  function walkAway() {
    finishSession(index > 0 ? guaranteedScoreOrCurrent(index) : 0, false);
  }
  // Le joueur qui se retire avant de répondre empoche le palier de la question PRÉCÉDENTE déjà validée (index-1), pas le palier en cours d'affichage (pas encore gagné).
  function guaranteedScoreOrCurrent(i: number): number {
    return MILLIONAIRE_LADDER[i - 1] ?? 0;
  }

  function useJoker(key: keyof JokerState) {
    if (jokers[key] || selectedIndex !== null || !question) return;
    setJokers((j) => ({ ...j, [key]: true }));
    setJokerUsedThisQuestion((prev) => prev ?? key);

    if (key === "fiftyFifty") {
      const wrongIndexes = [0, 1, 2, 3].filter((i) => i !== question.correctIndex);
      const toEliminate = wrongIndexes.sort(() => Math.random() - 0.5).slice(0, 2);
      setEliminated(toEliminate);
    } else if (key === "hint") {
      setShowHint(true);
    } else if (key === "changeCard") {
      setChangingCard(true);
      const excludeCardNumbers = questions.map((q) => q.cardNumber);
      fetch("/api/quiz/joker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ excludeCardNumbers, difficulty: question.difficultyTier, order: question.order }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.ok) {
            setQuestions((qs) => qs.map((q, i) => (i === index ? data.question : q)));
            setEliminated([]);
            setShowHint(false);
            setQuestionShownAt(Date.now());
          }
        })
        .finally(() => setChangingCard(false));
    }
  }

  if (phase === "loading") {
    return <div className="text-center py-16 text-[var(--quiz-steel)]">Préparation de la partie…</div>;
  }

  if (phase === "error") {
    return (
      <div className="quiz-panel p-6 max-w-md mx-auto text-center space-y-3">
        <p className="text-sm text-[var(--quiz-danger)]">{errorMsg}</p>
        <Link href="/quiz" className="quiz-btn inline-block">
          Retour
        </Link>
      </div>
    );
  }

  if (phase === "finished" && summary) {
    return <QuizResultsScreen summary={summary} endedByError={endedByError} onReplay={startGame} />;
  }

  if (!question) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Link href="/quiz" className="text-xs text-[var(--quiz-steel)] hover:text-[var(--quiz-gold)]">
          ← Quitter
        </Link>
        <QuizLanguageToggle value={language} onChange={setLanguage} />
      </div>

      <div className="grid md:grid-cols-[1fr_260px] gap-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="quiz-badge quiz-badge-gold">
              Question {index + 1} / {questions.length} — Difficulté {question.difficultyTier}
            </span>
            {selectedIndex === null && index > 0 && (
              <button onClick={walkAway} className="quiz-btn !py-1.5 !px-3 text-xs">
                Empocher {MILLIONAIRE_LADDER[index - 1].toLocaleString("fr-FR")} pts
              </button>
            )}
          </div>

          <QuizJokerBar used={jokers} disabled={selectedIndex !== null || changingCard} onUse={useJoker} />

          {changingCard ? (
            <div className="text-center py-10 text-sm text-[var(--quiz-steel)]">Changement de carte…</div>
          ) : (
            <div className="grid sm:grid-cols-[220px_1fr] gap-4">
              <QuizCardDisplay question={question} revealed={selectedIndex !== null} />
              <div className="space-y-3">
                {showHint && selectedIndex === null && question.explanationFr && (
                  <div className="quiz-panel2 p-3 text-xs text-[var(--quiz-gold)] leading-relaxed">
                    🧭 <b>Indice Coach :</b> {question.explanationFr}
                  </div>
                )}
                <QuizAnswerButtons
                  options={question.options}
                  correctIndex={question.correctIndex}
                  selectedIndex={selectedIndex}
                  eliminatedIndexes={eliminated}
                  onSelect={selectAnswer}
                />
              </div>
            </div>
          )}

          {selectedIndex !== null && (
            <QuizFeedbackPanel
              question={question}
              wasCorrect={wasCorrect}
              language={language}
              onNext={nextQuestion}
              nextLabel={!wasCorrect ? "Voir le résultat final" : index + 1 >= questions.length ? "Voir le résultat final" : "Question suivante"}
            />
          )}
        </div>

        <QuizLadder currentIndex={selectedIndex !== null && wasCorrect ? index + 1 : index} />
      </div>
    </div>
  );
}
