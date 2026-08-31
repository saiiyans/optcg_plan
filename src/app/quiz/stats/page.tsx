"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ADMIN_HEADERS } from "@/lib/adminHeaders";
import { MASTERY_LABELS } from "@/lib/quizSpacedRepetition";
import { QUIZ_CANDIDATES } from "@/lib/quizCandidates";

interface Overview {
  ok: boolean;
  totalTarget: number;
  readyCount: number;
  incompleteCount: number;
  studied: number;
  mastered: number;
  dueToday: number;
  successRatePct: number;
  currentStreak: number;
  bestMillionaireScore: number;
  sessionsCount: number;
  totalTrainingMs: number;
  trainingDaysCount: number;
  topErrorCards: { cardNumber: string; errors: number }[];
  byColor: { key: string; total: number; mastered: number }[];
  byDifficulty: { key: string; total: number; mastered: number }[];
  byArchetype: { key: string; total: number; mastered: number }[];
}

/**
 * /quiz/stats — tableau de bord DÉDIÉ au Quiz des effets, séparé de
 * /dashboard (vraies parties OPTCG) — jamais mélangé, demande explicite
 * du cahier des charges. Voir /api/quiz/overview.
 */
export default function QuizStatsPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [buildStatus, setBuildStatus] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);

  function load() {
    fetch("/api/quiz/overview")
      .then((r) => r.json())
      .then((d) => d.ok && setOverview(d))
      .catch(() => {});
  }

  useEffect(load, []);

  async function buildMoreCards() {
    setBuilding(true);
    setBuildStatus("Construction en cours…");
    let guard = 0;
    while (guard < 30) {
      guard++;
      const res = await fetch("/api/admin/quiz-build", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...ADMIN_HEADERS },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => null);
      if (!data || !data.ok) {
        setBuildStatus(data?.error ?? "Erreur pendant la construction (voir logs Vercel).");
        break;
      }
      if (data.processed > 0) {
        setBuildStatus(`En cours… ${data.remaining} carte(s) candidate(s) restante(s).`);
        load();
      }
      if (data.done) {
        setBuildStatus("Terminé — toutes les cartes candidates ont été traitées.");
        load();
        break;
      }
    }
    setBuilding(false);
  }

  if (!overview) {
    return <div className="text-center py-16 text-[var(--quiz-steel)]">Chargement des statistiques…</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <Link href="/quiz" className="text-xs text-[var(--quiz-steel)] hover:text-[var(--quiz-gold)]">
          ← Quiz des effets
        </Link>
        <h1 className="mt-2 text-2xl quiz-title">Statistiques du quiz</h1>
        <p className="text-xs text-[var(--quiz-steel)] mt-1">
          Séparées des vraies statistiques de parties OPTCG (voir /dashboard) — ceci ne concerne que ta mémorisation des
          effets de cartes.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="quiz-panel2 p-3 text-center">
          <div className="text-xl font-bold text-[var(--quiz-ivory)]">{overview.readyCount}</div>
          <div className="text-[10px] text-[var(--quiz-steel)] mt-0.5">Cartes prêtes / {overview.totalTarget}</div>
        </div>
        <div className="quiz-panel2 p-3 text-center">
          <div className="text-xl font-bold quiz-gold-text">{overview.mastered}</div>
          <div className="text-[10px] text-[var(--quiz-steel)] mt-0.5">Maîtrisées (5★)</div>
        </div>
        <div className="quiz-panel2 p-3 text-center">
          <div className="text-xl font-bold text-[var(--quiz-ivory)]">{overview.successRatePct}%</div>
          <div className="text-[10px] text-[var(--quiz-steel)] mt-0.5">Précision globale</div>
        </div>
        <div className="quiz-panel2 p-3 text-center">
          <div className="text-xl font-bold text-[var(--quiz-ivory)]">{overview.currentStreak}</div>
          <div className="text-[10px] text-[var(--quiz-steel)] mt-0.5">Série en cours</div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="quiz-panel2 p-3 text-center">
          <div className="text-lg font-bold text-[var(--quiz-ivory)]">{overview.bestMillionaireScore.toLocaleString("fr-FR")}</div>
          <div className="text-[10px] text-[var(--quiz-steel)] mt-0.5">Meilleur score Millionnaire</div>
        </div>
        <div className="quiz-panel2 p-3 text-center">
          <div className="text-lg font-bold text-[var(--quiz-ivory)]">{overview.sessionsCount}</div>
          <div className="text-[10px] text-[var(--quiz-steel)] mt-0.5">Parties jouées</div>
        </div>
        <div className="quiz-panel2 p-3 text-center">
          <div className="text-lg font-bold text-[var(--quiz-ivory)]">{Math.round(overview.totalTrainingMs / 60000)} min</div>
          <div className="text-[10px] text-[var(--quiz-steel)] mt-0.5">Temps total estimé</div>
        </div>
        <div className="quiz-panel2 p-3 text-center">
          <div className="text-lg font-bold text-[var(--quiz-ivory)]">{overview.trainingDaysCount}</div>
          <div className="text-[10px] text-[var(--quiz-steel)] mt-0.5">Jours d'entraînement</div>
        </div>
      </div>

      {overview.dueToday > 0 && (
        <Link href="/quiz/training?scope=due_today" className="quiz-panel2 p-3.5 flex items-center justify-between gap-3 hover:border-[var(--quiz-gold)] transition-colors block">
          <span className="text-sm">
            📅 <b>{overview.dueToday}</b> carte(s) due(s) pour révision aujourd'hui
          </span>
          <span className="quiz-gold-text text-sm font-semibold">Réviser →</span>
        </Link>
      )}

      <div className="quiz-panel p-4">
        <div className="quiz-eyebrow mb-2">Progression par couleur</div>
        <div className="space-y-1.5">
          {overview.byColor.map((c) => (
            <ProgressRow key={c.key} label={c.key} total={c.total} mastered={c.mastered} />
          ))}
          {overview.byColor.length === 0 && <p className="text-xs text-[var(--quiz-steel)]">Aucune carte prête pour le moment.</p>}
        </div>
      </div>

      <div className="quiz-panel p-4">
        <div className="quiz-eyebrow mb-2">Progression par difficulté</div>
        <div className="space-y-1.5">
          {overview.byDifficulty.map((d) => (
            <ProgressRow key={d.key} label={`Difficulté ${d.key}`} total={d.total} mastered={d.mastered} />
          ))}
        </div>
      </div>

      <div className="quiz-panel p-4">
        <div className="quiz-eyebrow mb-2">Progression par archétype</div>
        <div className="space-y-1.5">
          {overview.byArchetype.map((a) => (
            <ProgressRow key={a.key} label={a.key} total={a.total} mastered={a.mastered} />
          ))}
        </div>
      </div>

      {overview.topErrorCards.length > 0 && (
        <div className="quiz-panel p-4">
          <div className="quiz-eyebrow mb-2">Cartes les plus ratées</div>
          <div className="flex flex-wrap gap-1.5">
            {overview.topErrorCards.map((c) => (
              <span key={c.cardNumber} className="quiz-badge">
                {c.cardNumber} · {c.errors} erreur(s)
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="text-[11px] text-[var(--quiz-steel)]/70 space-y-1">
        <div className="font-semibold">Niveaux de maîtrise :</div>
        {Object.entries(MASTERY_LABELS).map(([lvl, label]) => (
          <div key={lvl}>
            {lvl}★ — {label}
          </div>
        ))}
      </div>

      {overview.readyCount + overview.incompleteCount < QUIZ_CANDIDATES.length && (
        // BUG CORRIGÉ (31/08/2026) : ce bloc était gardé par
        // `incompleteCount > 0`, ce qui le cachait complètement sur une
        // base toute neuve (0 QuizCard, ready=0 ET incomplete=0) — donc
        // exactement le cas où le joueur en a le plus besoin (aucune carte
        // n'a encore été construite du tout), le bouton était invisible et
        // /quiz/millionaire échouait avec "pas assez de cartes prêtes" sans
        // aucun moyen de corriger ça depuis l'interface. Condition
        // corrigée : le bouton apparaît tant qu'il reste des candidats de
        // QUIZ_CANDIDATES jamais traités, peu importe l'état de départ.
        <div className="quiz-panel2 p-4 space-y-2">
          <p className="text-xs text-[var(--quiz-steel)]">
            {overview.readyCount === 0 && overview.incompleteCount === 0
              ? `Aucune carte de quiz construite pour le moment (${QUIZ_CANDIDATES.length} candidates au total). Lance la construction pour pouvoir jouer.`
              : `${overview.incompleteCount} carte(s) candidate(s) pas encore prête(s) (texte officiel manquant en base, ou traduction/mauvaises réponses pas encore validées par l'IA).`}
          </p>
          <button onClick={buildMoreCards} disabled={building} className="quiz-btn quiz-btn-gold">
            {building ? "Construction…" : "Construire plus de cartes"}
          </button>
          {buildStatus && <p className="text-[11px] text-[var(--quiz-steel)]">{buildStatus}</p>}
        </div>
      )}
    </div>
  );
}

function ProgressRow({ label, total, mastered }: { label: string; total: number; mastered: number }) {
  const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-0.5">
        <span className="text-[var(--quiz-ivory)]">{label}</span>
        <span className="text-[var(--quiz-steel)]">
          {mastered}/{total}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--quiz-panel2)] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--quiz-gold)" }} />
      </div>
    </div>
  );
}
