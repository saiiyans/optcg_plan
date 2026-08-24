"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { DailyProgressResult, DailyColor } from "@/lib/trainingPhase";
import { onMatchLogged } from "@/lib/trainingCounterBus";

// --- Widget compteur d'entraînement (section 3) — visible sur toutes les
// pages (rendu depuis le layout racine). Version compacte dans l'en-tête,
// panneau détaillé au clic. Sondage périodique en secours + rafraîchissement
// immédiat via trainingCounterBus dès qu'une partie est enregistrée.

const POLL_INTERVAL_MS = 90_000;

interface DailyProgressResponse {
  ok: boolean;
  progress: DailyProgressResult;
  activeMission: { id: string; priorityKey: string; instructions: string | null; why: string | null; matchIds: string[] } | null;
}

const COLOR_CLASSES: Record<DailyColor, string> = {
  gray: "badge-gray",
  orange: "badge-orange",
  green: "badge-green",
  gold: "badge-gold",
  red: "badge-red",
};

export function HeaderTrainingCounter() {
  const [data, setData] = useState<DailyProgressResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/coach/daily-progress", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) {
        setData(json);
        setError(false);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    refresh();
    const unsubscribe = onMatchLogged(refresh);
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      unsubscribe();
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  if (error || !data) {
    // Ne jamais bloquer/casser l'en-tête si l'API n'a pas encore répondu —
    // espace réservé discret, pas d'erreur visible.
    return <div className="w-16 sm:w-40 h-7" aria-hidden />;
  }

  const { progress, activeMission } = data;
  const colorClass = COLOR_CLASSES[progress.colorToday];

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`badge ${colorClass} inline-flex items-center gap-1.5 !normal-case !tracking-normal font-mono text-xs px-3 py-1.5 hover:brightness-110 transition`}
        aria-expanded={open}
      >
        <span className="hidden sm:inline">
          Aujourd&rsquo;hui {progress.gamesToday}/{progress.dailyGoal}
          {" • "}Série {progress.currentStreak} jour{progress.currentStreak !== 1 ? "s" : ""}
          {progress.daysUntilTournament !== null && <> • Tournoi J-{progress.daysUntilTournament}</>}
        </span>
        <span className="sm:hidden">
          {progress.gamesToday}/{progress.dailyGoal}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 card-tile rounded-xl p-4 z-40 space-y-3 text-sm">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-textMuted text-xs uppercase tracking-wider">Aujourd&rsquo;hui</span>
              <span className={`badge ${colorClass}`}>
                {progress.gamesToday}/{progress.dailyGoal}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-panel2 overflow-hidden">
              <div
                className="h-full bg-emerald transition-all"
                style={{ width: `${Math.min(100, (progress.gamesToday / progress.dailyGoal) * 100)}%` }}
              />
            </div>
            {progress.goalExceededToday && (
              <div className="text-[11px] text-gold mt-1">Objectif dépassé : +{progress.surplusToday} partie{progress.surplusToday > 1 ? "s" : ""}</div>
            )}
            {!progress.goalMetToday && progress.gamesToday > 0 && (
              <div className="text-[11px] text-textMuted mt-1">Il reste {progress.remainingToday} partie{progress.remainingToday > 1 ? "s" : ""} aujourd&rsquo;hui</div>
            )}
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-textMuted">Série en cours</span>
            <span className="text-ivory">{progress.currentStreak} jour{progress.currentStreak !== 1 ? "s" : ""} (record {progress.bestStreak})</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-textMuted">Cette semaine</span>
            <span className="text-ivory">{progress.week.gamesThisWeek} parties</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-textMuted">Total entraînement officiel</span>
            <span className="text-ivory">{progress.totalOfficialGames}</span>
          </div>

          {progress.daysUntilTournament !== null && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-textMuted">Tournoi</span>
              <span className="text-ivory">J-{progress.daysUntilTournament}</span>
            </div>
          )}

          <div className="border-t border-line pt-3">
            <div className="text-textMuted text-xs uppercase tracking-wider mb-1">Mission en cours</div>
            {activeMission ? (
              <>
                <div className="text-ivory text-xs font-medium">{activeMission.priorityKey}</div>
                {activeMission.instructions && <div className="text-textMuted text-[11px] mt-0.5">{activeMission.instructions}</div>}
                <div className="text-[11px] text-steel/70 mt-1">{activeMission.matchIds.length}/3 parties</div>
              </>
            ) : (
              <div className="text-[11px] text-textMuted">Aucune mission active pour l&rsquo;instant.</div>
            )}
          </div>

          <Link
            href="/journal"
            onClick={() => setOpen(false)}
            className="btn btn-primary w-full justify-center flex items-center text-xs"
          >
            Enregistrer une partie
          </Link>
        </div>
      )}
    </div>
  );
}
