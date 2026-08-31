"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
}

/**
 * /quiz — accueil du Quiz des effets. Sélection du mode + aperçu rapide
 * des stats (jamais mélangées aux vraies stats de parties OPTCG, voir
 * /api/quiz/overview et /quiz/stats pour le détail complet).
 */
export default function QuizHomePage() {
  const [overview, setOverview] = useState<Overview | null>(null);

  useEffect(() => {
    fetch("/api/quiz/overview")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setOverview(d);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center pt-1">
        <div className="quiz-eyebrow">✦ Quiz des effets</div>
        <h1 className="mt-1.5 text-3xl sm:text-4xl quiz-title leading-[1.05]">
          Mémorise les effets <span className="quiz-gold-text">de la méta OP17</span>
        </h1>
        <p className="text-sm text-[var(--quiz-steel)] mt-2.5 max-w-lg mx-auto leading-relaxed">
          Devine l'effet exact de chaque carte à partir de son image — avec le texte masqué. Deux modes : la tension du
          Millionnaire, ou un entraînement libre pour combler tes lacunes.
        </p>
      </div>

      {overview && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="quiz-panel2 p-3 text-center">
            <div className="text-xl font-bold text-[var(--quiz-ivory)]">{overview.readyCount}</div>
            <div className="text-[10px] text-[var(--quiz-steel)] mt-0.5">Cartes prêtes</div>
          </div>
          <div className="quiz-panel2 p-3 text-center">
            <div className="text-xl font-bold quiz-gold-text">{overview.mastered}</div>
            <div className="text-[10px] text-[var(--quiz-steel)] mt-0.5">Maîtrisées</div>
          </div>
          <div className="quiz-panel2 p-3 text-center">
            <div className="text-xl font-bold text-[var(--quiz-ivory)]">{overview.dueToday}</div>
            <div className="text-[10px] text-[var(--quiz-steel)] mt-0.5">Dues aujourd'hui</div>
          </div>
          <div className="quiz-panel2 p-3 text-center">
            <div className="text-xl font-bold text-[var(--quiz-ivory)]">{overview.bestMillionaireScore.toLocaleString("fr-FR")}</div>
            <div className="text-[10px] text-[var(--quiz-steel)] mt-0.5">Meilleur score</div>
          </div>
        </div>
      )}

      {overview && overview.dueToday > 0 && (
        <Link
          href="/quiz/training?scope=due_today"
          className="quiz-panel2 p-3.5 flex items-center justify-between gap-3 hover:border-[var(--quiz-gold)] transition-colors"
          style={{ borderColor: "var(--quiz-gold)" }}
        >
          <span className="text-sm">
            📅 <b>{overview.dueToday}</b> carte(s) due(s) pour révision aujourd'hui
          </span>
          <span className="quiz-gold-text text-sm font-semibold">Réviser →</span>
        </Link>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <Link href="/quiz/millionaire" className="quiz-panel p-5 space-y-2.5 block hover:border-[var(--quiz-gold)] transition-colors">
          <div className="text-3xl">👑</div>
          <div className="text-lg font-bold text-[var(--quiz-ivory)]">Mode Millionnaire</div>
          <p className="text-xs text-[var(--quiz-steel)] leading-relaxed">
            15 questions, difficulté croissante, 2 paliers sécurisés, 3 jokers. Une erreur met fin à la partie.
          </p>
          <div className="quiz-btn quiz-btn-gold inline-block mt-1">Jouer</div>
        </Link>

        <Link href="/quiz/training" className="quiz-panel p-5 space-y-2.5 block hover:border-[var(--quiz-gold)] transition-colors">
          <div className="text-3xl">🎯</div>
          <div className="text-lg font-bold text-[var(--quiz-ivory)]">Mode Entraînement</div>
          <p className="text-xs text-[var(--quiz-steel)] leading-relaxed">
            Sans élimination. Filtre par couleur, archétype, difficulté, ou cible directement tes cartes dues/jamais
            étudiées/les plus fragiles.
          </p>
          <div className="quiz-btn inline-block mt-1">Configurer</div>
        </Link>
      </div>

      <div className="text-center">
        <Link href="/quiz/stats" className="text-xs text-[var(--quiz-steel)] hover:text-[var(--quiz-gold)] underline">
          Voir toutes les statistiques du quiz →
        </Link>
      </div>

      {overview && overview.incompleteCount > 0 && (
        <p className="text-[11px] text-[var(--quiz-steel)]/70 text-center">
          {overview.incompleteCount} carte(s) candidate(s) pas encore prête(s) (texte officiel ou traduction en attente) —
          voir /quiz/stats pour les compléter.
        </p>
      )}
    </div>
  );
}
