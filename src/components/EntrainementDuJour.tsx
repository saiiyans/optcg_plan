"use client";

import { useEffect, useState, useCallback } from "react";
import type { DailyProgressResult } from "@/lib/trainingPhase";
import { onMatchLogged } from "@/lib/trainingCounterBus";

// --- Zone "Entraînement du jour" (section 4) — en tête de /journal.
// Répond immédiatement aux questions : combien de parties aujourd'hui ?
// quelle est la mission en cours ? quel matchup prioritaire ? combien de
// jours avant le tournoi ? — avec un message motivant, jamais culpabilisant
// (section 20 : pas de phrasing exagéré, pas de récompense enfantine).

interface DailyProgressResponse {
  ok: boolean;
  progress: DailyProgressResult;
  activeMission: { id: string; priorityKey: string; instructions: string | null; why: string | null; matchIds: string[] } | null;
}

interface ObjectiveItem {
  id: string;
  category: string;
  text: string;
  done: boolean;
}

function motivationalMessage(progress: DailyProgressResult): string {
  if (progress.goalExceededToday) return `Objectif dépassé : +${progress.surplusToday} partie${progress.surplusToday > 1 ? "s" : ""}.`;
  if (progress.goalMetToday) return "Objectif quotidien atteint.";
  if (progress.gamesToday === 0) {
    if (progress.currentStreak >= 2) return `Série de ${progress.currentStreak} jours en cours — première partie du jour ?`;
    return "Première partie du jour à enregistrer.";
  }
  return `Il reste ${progress.remainingToday} partie${progress.remainingToday > 1 ? "s" : ""} aujourd'hui.`;
}

export function EntrainementDuJour({ onRegisterClick }: { onRegisterClick?: () => void }) {
  const [data, setData] = useState<DailyProgressResponse | null>(null);
  const [priorityMatchup, setPriorityMatchup] = useState<ObjectiveItem | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/coach/daily-progress", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) setData(json);
    } catch {
      // silencieux — la zone reste en état de chargement plutôt que de casser la page
    }
  }, []);

  useEffect(() => {
    refresh();
    const unsubscribe = onMatchLogged(refresh);
    return unsubscribe;
  }, [refresh]);

  useEffect(() => {
    fetch("/api/objectives")
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) return;
        const active = (d.items as ObjectiveItem[]).filter((i) => i.category === "matchups" && !i.done);
        setPriorityMatchup(active[0] ?? null);
      })
      .catch(() => {});
  }, []);

  if (!data) {
    return <div className="card-tile rounded-sm p-5 h-40 animate-pulse" aria-hidden />;
  }

  const { progress, activeMission } = data;
  const pct = Math.min(100, (progress.gamesToday / progress.dailyGoal) * 100);

  return (
    <div className="card-tile rounded-sm p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-gold">Entraînement du jour</div>
          <div className="text-2xl font-display font-semibold text-ivory mt-1">
            {progress.gamesToday}/{progress.dailyGoal} parties
          </div>
          <div className="text-xs text-textMuted mt-1">{motivationalMessage(progress)}</div>
        </div>
        {progress.daysUntilTournament !== null && (
          <div className="text-right">
            <div className="text-xl font-mono text-gold">J-{progress.daysUntilTournament}</div>
            <div className="text-[10px] uppercase tracking-wider text-steel/60">avant le tournoi</div>
          </div>
        )}
      </div>

      <div className="h-2 rounded-full bg-panel2 overflow-hidden">
        <div
          className={`h-full transition-all ${progress.goalExceededToday ? "bg-gold" : "bg-emerald"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-panel2 rounded-lg p-3">
          <div className="text-[10px] font-mono uppercase text-steel/60 mb-1">Mission en cours</div>
          {activeMission ? (
            <>
              <div className="text-sm text-ivory">{activeMission.priorityKey}</div>
              {activeMission.instructions && <div className="text-xs text-textMuted mt-1">{activeMission.instructions}</div>}
              <div className="text-[11px] text-steel/60 mt-1.5">{activeMission.matchIds.length}/3 parties</div>
            </>
          ) : (
            <div className="text-xs text-textMuted">Aucune mission active — se sélectionne automatiquement dès qu'assez de défaites documentées existent.</div>
          )}
        </div>

        <div className="bg-panel2 rounded-lg p-3">
          <div className="text-[10px] font-mono uppercase text-steel/60 mb-1">Matchup prioritaire</div>
          {priorityMatchup ? (
            <div className="text-sm text-ivory">{priorityMatchup.text}</div>
          ) : (
            <div className="text-xs text-textMuted">Aucun matchup prioritaire identifié pour l'instant.</div>
          )}
        </div>
      </div>

      <button onClick={onRegisterClick} className="btn btn-primary w-full sm:w-auto">
        Enregistrer une partie
      </button>
    </div>
  );
}
