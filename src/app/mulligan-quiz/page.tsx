"use client";
import { useState, useEffect } from "react";
import { MULLIGAN_SCENARIOS, shuffledScenarios, type MulliganScenario } from "@/lib/mulliganQuiz";
import { CardThumb } from "@/components/CardThumb";

// /mulligan-quiz — "Garder ou Mulligan ?". Petit entraînement autonome, pas
// une nouvelle source de stats : rien n'est écrit en base, le score ne vit
// que le temps de la session (voir shuffledScenarios dans mulliganQuiz.ts
// pour la note complète sur la nature pédagogique — pas officielle — de ces
// mains d'exemple).

export default function MulliganQuizPage() {
  // IMPORTANT : ne JAMAIS appeler shuffledScenarios() (Math.random()) dans
  // l'initialiseur de useState — ça tourne aussi côté serveur au premier
  // rendu, avec un ordre aléatoire différent de celui du client, ce qui
  // provoque une erreur d'hydratation React (mismatch serveur/client). React
  // doit alors jeter et refaire tout l'arbre, et les boutons Garder/Mulligan
  // pouvaient rester inertes au premier chargement — c'est le bug "ça marche
  // pas" remonté par le joueur. Fix : état initial déterministe (ordre non
  // mélangé, identique serveur/client), puis mélange dans un useEffect —
  // qui ne s'exécute jamais côté serveur, donc plus aucun risque de
  // mismatch.
  const [order, setOrder] = useState<MulliganScenario[]>(MULLIGAN_SCENARIOS);
  useEffect(() => {
    setOrder(shuffledScenarios());
  }, []);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<"garder" | "mulligan" | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const scenario = order[index];
  const isLast = index >= order.length - 1;

  function choose(choice: "garder" | "mulligan") {
    if (answer) return; // déjà répondu à cette main
    setAnswer(choice);
    setScore((s) => ({ correct: s.correct + (choice === scenario.correctAnswer ? 1 : 0), total: s.total + 1 }));
  }

  function next() {
    if (isLast) {
      setOrder(shuffledScenarios());
      setIndex(0);
    } else {
      setIndex((i) => i + 1);
    }
    setAnswer(null);
  }

  function restart() {
    setOrder(shuffledScenarios());
    setIndex(0);
    setAnswer(null);
    setScore({ correct: 0, total: 0 });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="pt-1 pb-1">
        <span className="eyebrow-flame">✦ Entraînement</span>
        <h1 className="mt-1.5 text-3xl sm:text-4xl font-extrabold tracking-tight text-ivory leading-[1.05]">
          Garder <span className="text-flame-gradient italic">ou mulligan ?</span>
        </h1>
        <p className="text-sm text-steel/70 mt-2 max-w-xl">
          {MULLIGAN_SCENARIOS.length} mains d'exemple pour t'entraîner à la décision de mulligan avec Mihawk (Vert). Exemples
          pédagogiques construits à partir du plan de jeu déjà présent dans l'app (Deck Profile) — pas des statistiques
          officielles, pas des mains réellement tirées en tournoi.
        </p>
      </div>

      <div className="flex items-center justify-between text-xs font-mono text-steel/60">
        <span>
          Main {index + 1} / {order.length}
        </span>
        <span>
          Score : <b className="text-gold">{score.correct}</b> / {score.total}
        </span>
      </div>

      <section className="card-tile p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="badge">{scenario.turnOrder === "goingFirst" ? "Tu joues en premier" : "Tu joues en second"}</span>
        </div>

        <div className="flex flex-wrap gap-3">
          {scenario.hand.map((card, i) =>
            card.cardNumber ? (
              <CardThumb key={i} cardNumber={card.cardNumber} size={64} showLabel={false} />
            ) : (
              <div
                key={i}
                className="flex items-center justify-center text-center px-1 border border-dashed border-line rounded-md bg-panel2/50"
                style={{ width: 64, height: Math.round(64 * 1.4) }}
              >
                <span className="text-[8px] font-mono text-steel/40 leading-tight">carte non-clé</span>
              </div>
            )
          )}
        </div>

        <div className="space-y-1">
          {scenario.hand.map((card, i) => (
            <div key={i} className="text-xs font-mono text-steel/70">
              {card.label}
            </div>
          ))}
        </div>

        {!answer ? (
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button onClick={() => choose("garder")} className="btn btn-primary">
              Garder
            </button>
            <button onClick={() => choose("mulligan")} className="btn">
              Mulligan
            </button>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            <div
              className={`text-sm font-bold ${answer === scenario.correctAnswer ? "text-emerald-bright" : "text-red-400"}`}
            >
              {answer === scenario.correctAnswer ? "✓ Bonne réponse" : "✗ Pas la meilleure décision ici"} — la bonne réponse
              était : {scenario.correctAnswer === "garder" ? "Garder" : "Mulligan"}
            </div>
            <p className="text-xs text-steel/70 leading-relaxed bg-panel2 p-3 rounded">{scenario.explanation}</p>
            <button onClick={next} className="btn btn-primary w-full">
              {isLast ? "Recommencer avec un nouvel ordre" : "Main suivante"}
            </button>
          </div>
        )}
      </section>

      {score.total > 0 && (
        <button onClick={restart} className="text-xs font-mono text-steel/50 hover:text-steel/80 underline">
          Réinitialiser le score
        </button>
      )}
    </div>
  );
}
