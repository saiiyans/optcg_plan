"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { QuizCardDisplay } from "@/components/quiz/QuizCardDisplay";
import { QuizAnswerButtons } from "@/components/quiz/QuizAnswerButtons";
import { QuizFeedbackPanel } from "@/components/quiz/QuizFeedbackPanel";
import { QuizResultsScreen, type QuizSessionSummary } from "@/components/quiz/QuizResultsScreen";
import { QuizLanguageToggle, readStoredQuizLanguage, type QuizLanguage } from "@/components/quiz/QuizLanguageToggle";
import type { QuizQuestion } from "@/lib/quizTypes";
import type { TrainingFilters } from "@/lib/quizSelection";

type Phase = "config" | "loading" | "playing" | "answered" | "finished" | "empty";

interface Overview {
  byColor: { key: string; total: number }[];
  byArchetype: { key: string; total: number }[];
}

const SCOPE_LABELS: Record<string, string> = {
  all: "Toutes les cartes prêtes",
  due_today: "Dues aujourd'hui (répétition espacée)",
  never_studied: "Jamais étudiées",
  weakest: "Les plus fragiles (niveau le plus bas)",
  mistakes: "Cartes déjà ratées au moins une fois",
};

function TrainingPageInner() {
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<Phase>("config");
  const [count, setCount] = useState(10);
  const [scope, setScope] = useState<string>(searchParams.get("scope") ?? "all");
  const [color, setColor] = useState("");
  const [archetype, setArchetype] = useState("");
  const [difficulty, setDifficulty] = useState<0 | 1 | 2 | 3>(0);
  const [leadersOnly, setLeadersOnly] = useState(false);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [language, setLanguage] = useState<QuizLanguage>("fr");

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [wasCorrect, setWasCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [questionShownAt, setQuestionShownAt] = useState(Date.now());
  const [summary, setSummary] = useState<QuizSessionSummary | null>(null);

  useEffect(() => {
    setLanguage(readStoredQuizLanguage());
    fetch("/api/quiz/overview")
      .then((r) => r.json())
      .then((d) => d.ok && setOverview(d))
      .catch(() => {});
  }, []);

  function buildFilters(): TrainingFilters {
    const filters: TrainingFilters = {};
    if (scope && scope !== "all") filters.scope = scope as TrainingFilters["scope"];
    if (color) filters.color = color;
    if (archetype) filters.archetype = archetype;
    if (difficulty) filters.difficulty = difficulty;
    if (leadersOnly) filters.leadersOnly = true;
    return filters;
  }

  async function startSession() {
    setPhase("loading");
    const res = await fetch("/api/quiz/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "training", count, filters: buildFilters() }),
    });
    const data = await res.json();
    if (!data.ok || data.questions.length === 0) {
      setPhase("empty");
      return;
    }
    setSessionId(data.sessionId);
    setQuestions(data.questions);
    setIndex(0);
    setSelectedIndex(null);
    setCorrectCount(0);
    setSummary(null);
    setQuestionShownAt(Date.now());
    setPhase("playing");
  }

  const question = questions[index];

  async function selectAnswer(i: number) {
    if (!question || selectedIndex !== null) return;
    setSelectedIndex(i);
    const correct = i === question.correctIndex;
    setWasCorrect(correct);
    if (correct) setCorrectCount((c) => c + 1);
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
        jokerUsed: null,
        questionOrder: question.order,
      }),
    }).catch(() => {});
  }

  async function nextQuestion() {
    if (index + 1 >= questions.length) {
      if (!sessionId) return;
      const res = await fetch("/api/quiz/session/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, scoreReached: 0, endedByError: false }),
      });
      const data = await res.json();
      if (data.ok) {
        setSummary(data);
        setPhase("finished");
      }
      return;
    }
    setIndex((i) => i + 1);
    setSelectedIndex(null);
    setQuestionShownAt(Date.now());
    setPhase("playing");
  }

  if (phase === "config") {
    return (
      <div className="max-w-2xl mx-auto space-y-5">
        <div>
          <Link href="/quiz" className="text-xs text-[var(--quiz-steel)] hover:text-[var(--quiz-gold)]">
            ← Quiz des effets
          </Link>
          <h1 className="mt-2 text-2xl quiz-title">Mode Entraînement</h1>
          <p className="text-sm text-[var(--quiz-steel)] mt-1">Sans élimination — configure ta session ci-dessous.</p>
        </div>

        <div className="quiz-panel p-4 space-y-4">
          <div>
            <div className="quiz-eyebrow mb-1.5">Nombre de questions</div>
            <div className="flex gap-2">
              {[10, 20, 50].map((n) => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className={`quiz-btn !py-1.5 !px-3.5 ${count === n ? "quiz-btn-gold" : ""}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="quiz-eyebrow mb-1.5">Cible</div>
            <select value={scope} onChange={(e) => setScope(e.target.value)} className="input w-full bg-[var(--quiz-panel2)] border-[var(--quiz-line-strong)]">
              {Object.entries(SCOPE_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="quiz-eyebrow mb-1.5">Couleur</div>
              <select value={color} onChange={(e) => setColor(e.target.value)} className="input w-full bg-[var(--quiz-panel2)] border-[var(--quiz-line-strong)]">
                <option value="">Toutes</option>
                {(overview?.byColor ?? []).map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.key} ({c.total})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="quiz-eyebrow mb-1.5">Archétype</div>
              <select value={archetype} onChange={(e) => setArchetype(e.target.value)} className="input w-full bg-[var(--quiz-panel2)] border-[var(--quiz-line-strong)]">
                <option value="">Tous</option>
                {(overview?.byArchetype ?? []).map((a) => (
                  <option key={a.key} value={a.key}>
                    {a.key} ({a.total})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <div className="quiz-eyebrow mb-1.5">Difficulté</div>
              <div className="flex gap-1.5">
                {[0, 1, 2, 3].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d as 0 | 1 | 2 | 3)}
                    className={`quiz-btn !py-1.5 !px-3 ${difficulty === d ? "quiz-btn-gold" : ""}`}
                  >
                    {d === 0 ? "Toutes" : d}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-[var(--quiz-ivory)] cursor-pointer mt-4">
              <input type="checkbox" checked={leadersOnly} onChange={(e) => setLeadersOnly(e.target.checked)} />
              Leaders uniquement
            </label>
          </div>

          <button onClick={startSession} className="quiz-btn quiz-btn-gold w-full">
            Démarrer l'entraînement
          </button>
        </div>
      </div>
    );
  }

  if (phase === "loading") {
    return <div className="text-center py-16 text-[var(--quiz-steel)]">Préparation…</div>;
  }

  if (phase === "empty") {
    return (
      <div className="quiz-panel p-6 max-w-md mx-auto text-center space-y-3">
        <p className="text-sm text-[var(--quiz-steel)]">Aucune carte ne correspond à ces filtres pour le moment.</p>
        <button onClick={() => setPhase("config")} className="quiz-btn inline-block">
          Modifier les filtres
        </button>
      </div>
    );
  }

  if (phase === "finished" && summary) {
    return <QuizResultsScreen summary={summary} onReplay={() => setPhase("config")} />;
  }

  if (!question) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Link href="/quiz" className="text-xs text-[var(--quiz-steel)] hover:text-[var(--quiz-gold)]">
          ← Quitter
        </Link>
        <QuizLanguageToggle value={language} onChange={setLanguage} />
      </div>

      <div className="flex items-center justify-between text-xs font-mono text-[var(--quiz-steel)]">
        <span>
          Carte {index + 1} / {questions.length}
        </span>
        <span>
          Score : <b className="quiz-gold-text">{correctCount}</b> / {index + (selectedIndex !== null ? 1 : 0)}
        </span>
      </div>

      <div className="grid sm:grid-cols-[220px_1fr] gap-4">
        <QuizCardDisplay question={question} revealed={selectedIndex !== null} />
        <QuizAnswerButtons
          options={question.options}
          correctIndex={question.correctIndex}
          selectedIndex={selectedIndex}
          onSelect={selectAnswer}
        />
      </div>

      {selectedIndex !== null && (
        <QuizFeedbackPanel
          question={question}
          wasCorrect={wasCorrect}
          language={language}
          onNext={nextQuestion}
          nextLabel={index + 1 >= questions.length ? "Voir le résultat" : "Carte suivante"}
        />
      )}
    </div>
  );
}

export default function TrainingPage() {
  return (
    <Suspense fallback={<div className="text-center py-16 text-[var(--quiz-steel)]">Chargement…</div>}>
      <TrainingPageInner />
    </Suspense>
  );
}
