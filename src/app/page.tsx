"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { MIHAWK_NEWS } from "@/lib/mihawkGamePlan";

/** Fetch avec délai maximum — évite qu'un widget reste bloqué en
 * "Chargement..." pour toujours si le réseau ne répond jamais. */
async function fetchWithTimeout(url: string, ms = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`Erreur serveur (${res.status})`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// Refonte "espace de préparation tournoi" — l'accueil doit répondre à 4
// questions dès l'arrivée, sans scroller : combien de parties reste-t-il à
// jouer aujourd'hui, suis-je en progression, quelle est ma priorité, suis-je
// prêt pour le tournoi. Un seul appel à /api/coach/daily-progress (source
// unique : phase officielle uniquement, fuseau Asia/Bangkok, objectifs
// 4/jour-28/semaine réglés une fois pour toutes dans src/lib/config.ts) —
// plus aucun widget de la page ne recalcule ces chiffres différemment,
// contrairement à l'ancienne version (GameCounterWidget sur un plan à 114
// parties abandonné + TrainingWidget sur un objectif hebdo de 18, tous deux
// en heure UTC et sans filtre de phase officielle).
export default function HomePage() {
  return (
    <div className="space-y-6">
      <div className="pt-1 pb-1">
        <span className="eyebrow-flame">✦ One Piece TCG · Espace de coaching</span>
        <h1 className="mt-1.5 text-3xl sm:text-4xl font-extrabold tracking-tight text-ivory leading-[1.05]">
          Prépare <span className="text-flame-gradient italic">chaque tournoi.</span>
        </h1>
      </div>

      <TodayWidget />

      <StreakAndAchievementsWidget />

      <div>
        <h2 className="text-xs font-mono uppercase tracking-widest text-steel/50 mb-3 pt-2 border-t border-line">Vue d'ensemble</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <CoachDiagnosticWidget />
          <ObjectivesWidget />
          <SimWinrateWidget />
        </div>
        <div className="mt-4">
          <MihawkNewsWidget />
        </div>
      </div>
    </div>
  );
}

type LoadState = "loading" | "ready" | "error";

/** Message du coach — court, direct, ton encourageant. Jamais de chiffre
 * froid sans phrase autour. */
function coachLine(opts: {
  hasData: boolean;
  mission?: string;
  streakDays?: number;
  atRisk?: boolean;
  progressDelta?: number;
}): string {
  if (opts.atRisk && (opts.streakDays ?? 0) > 0) {
    return `Ta série de ${opts.streakDays} jour${opts.streakDays! > 1 ? "s" : ""} tient à un fil — une partie aujourd'hui et elle continue.`;
  }
  if (opts.progressDelta !== undefined && opts.progressDelta > 0) {
    return "Ta forme remonte sur tes dernières parties — sur cette lancée, une de plus ?";
  }
  if (opts.hasData && opts.mission) {
    return opts.mission;
  }
  return "Chaque partie loguée rend le coach plus précis sur ce qui compte pour toi. Go, la première ?";
}

/** LE widget principal de l'accueil — fusionne l'ancien "hero" (message du
 * coach + compte à rebours) et les deux anciens compteurs de parties
 * (compteur global 7-semaines + objectif du jour) en UN seul bloc cohérent,
 * entièrement dérivé de /api/coach/daily-progress. Répond directement aux
 * 4 questions demandées : parties restantes aujourd'hui, progression,
 * priorité du jour, prêt pour le tournoi (compte à rebours + accès Jour J). */
function TodayWidget() {
  const [state, setState] = useState<LoadState>("loading");
  const [progress, setProgress] = useState<any>(null);
  const [mission, setMission] = useState<any>(null);
  const [streak, setStreak] = useState<any>(null);
  const [coachProgress, setCoachProgress] = useState<any>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [daily, coach, achievements] = await Promise.all([
        fetchWithTimeout("/api/coach/daily-progress"),
        fetchWithTimeout("/api/coach/today"),
        fetchWithTimeout("/api/achievements"),
      ]);
      setProgress(daily.progress);
      setMission(coach.mission);
      setCoachProgress(coach.progress);
      setStreak(achievements.streak);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const daysLeft = progress?.daysUntilTournament ?? null;

  return (
    <div className="card-tile p-5 sm:p-6 border-emerald/40">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
        <div className="min-w-0">
          <div className="text-[11px] font-mono uppercase tracking-widest text-gold">Grand Asia OPTCG Championship LCQ</div>
          {state === "loading" ? (
            <div className="skeleton h-5 w-2/3 mt-1.5" />
          ) : state === "error" ? (
            <div className="text-xs text-red-400 mt-1">Chargement impossible.</div>
          ) : (
            <p className="text-base text-ivory font-semibold leading-snug mt-1">
              🧑‍🏫{" "}
              {coachLine({
                hasData: !!mission?.hasData,
                mission: mission?.mission,
                streakDays: streak?.currentStreak,
                atRisk: streak?.atRisk,
                progressDelta: coachProgress?.hasData ? coachProgress.delta : undefined,
              })}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-3xl font-mono font-bold text-gold">{daysLeft ?? "…"}</div>
          <div className="text-[10px] uppercase tracking-wider text-steel/60">jours restants</div>
        </div>
      </div>

      {state === "error" ? (
        <RetryBlock message="Impossible de charger ta progression." onRetry={load} />
      ) : (
        <div className="grid grid-cols-2 gap-3 mt-3">
          <MiniProgress
            label="Aujourd'hui"
            value={state === "loading" ? null : progress?.gamesToday}
            goal={state === "loading" ? null : progress?.dailyGoal}
            color={progress?.colorToday}
          />
          <MiniProgress
            label="Cette semaine"
            value={state === "loading" ? null : progress?.week?.gamesThisWeek}
            goal={state === "loading" ? null : progress?.week?.weeklyGoal}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mt-4 text-xs font-mono text-steel/60">
        {state === "ready" && (
          <>
            <span>🔥 Série : {streak?.currentStreak ?? 0} jour{(streak?.currentStreak ?? 0) > 1 ? "s" : ""}</span>
            {progress?.totalOfficialGames != null && <span>· {progress.totalOfficialGames} partie(s) officielle(s) au total</span>}
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        <Link href="/journal" className="btn btn-primary">
          Enregistrer une partie →
        </Link>
        {daysLeft !== null && daysLeft <= 1 && (
          <Link href="/tournament-day" className="btn border-flame/60 text-flame">
            ⚔️ Mode Jour J
          </Link>
        )}
      </div>
    </div>
  );
}

function MiniProgress({
  label,
  value,
  goal,
  color,
}: {
  label: string;
  value: number | null | undefined;
  goal: number | null | undefined;
  color?: string;
}) {
  const loading = value == null || goal == null;
  const pct = !loading && goal! > 0 ? Math.min(100, Math.round((value! / goal!) * 100)) : 0;
  const barColor =
    color === "gold" ? "bg-gold" : color === "red" ? "bg-red-500" : color === "green" ? "bg-emerald-dim" : "bg-emerald-dim";

  return (
    <div className="bg-panel2 rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-wider text-steel/60 mb-1">{label}</div>
      <div className="text-2xl font-mono font-bold text-white">
        {loading ? "…" : value} <span className="text-steel/50 text-sm">/ {loading ? "…" : goal}</span>
      </div>
      <div className="w-full h-1.5 bg-panel rounded-full overflow-hidden mt-2">
        <div className={`h-full ${barColor} transition-all`} style={{ width: `${loading ? 0 : pct}%` }} />
      </div>
    </div>
  );
}

/** Diagnostic complet — la version détaillée du message court du hero
 * ci-dessus (forces, faiblesse, progression). */
function CoachDiagnosticWidget() {
  const [state, setState] = useState<LoadState>("loading");
  const [weakness, setWeakness] = useState<any>(null);
  const [strengths, setStrengths] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const d = await fetchWithTimeout("/api/coach/today");
      setWeakness(d.weakness);
      setStrengths(d.strengths);
      setProgress(d.progress);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="card-tile p-5">
      <h3 className="font-mono text-xs uppercase tracking-widest text-gold mb-1 border-b border-line pb-2">🧑‍🏫 Diagnostic complet</h3>
      <p className="text-[11px] text-steel/50 mb-3">Basé uniquement sur tes parties enregistrées — jamais de règle officielle ici, juste ton propre historique.</p>

      {state === "loading" ? (
        <div className="space-y-2">
          <div className="skeleton h-5 w-3/4" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-2/3" />
        </div>
      ) : state === "error" ? (
        <RetryBlock message="Impossible de charger ton diagnostic." onRetry={load} />
      ) : (
        <div className="space-y-4">
          {/* FORCES */}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-bright mb-1">Forces</div>
            {!strengths?.hasData ? (
              <div className="text-xs font-mono text-steel/60">Échantillon insuffisant — {strengths?.reason}</div>
            ) : (
              <ul className="space-y-0.5">
                {strengths.strengths.map((s: any) => (
                  <li key={s.opponentLeader} className="text-xs text-steel/80">
                    <span className="text-white">{s.opponentLeader}</span> — {s.winrate}% sur {s.sampleSize} parties
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* FAIBLESSE PRINCIPALE */}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-red-400 mb-1">Faiblesse principale</div>
            {!weakness?.hasData ? (
              <div className="text-xs font-mono text-steel/60">Échantillon insuffisant — {weakness?.reason}</div>
            ) : (
              <div className="text-xs text-steel/80">
                <span className="text-white">{weakness.topMistake}</span> — présente sur {weakness.count}/{weakness.totalWithMistake} parties notées récemment.
              </div>
            )}
          </div>

          {/* PROGRESSION RÉCENTE */}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-gold mb-1">Progression récente</div>
            {!progress?.hasData ? (
              <div className="text-xs font-mono text-steel/60">Échantillon insuffisant — {progress?.reason}</div>
            ) : (
              <div className="text-xs text-steel/80">
                {progress.delta > 0 ? "↑" : progress.delta < 0 ? "↓" : "→"}{" "}
                <span className={progress.delta > 0 ? "text-emerald-bright" : progress.delta < 0 ? "text-red-400" : "text-white"}>
                  {progress.recentWinrate}%
                </span>{" "}
                sur tes {progress.recentSample} dernières parties, contre {progress.previousWinrate}% sur les {progress.previousSample} précédentes.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Compact — les 2 actus Mihawk les plus récentes. Données statiques (voir
 * MIHAWK_NEWS), pas de fetch nécessaire. */
function MihawkNewsWidget() {
  const latest = MIHAWK_NEWS.slice(0, 2);
  if (latest.length === 0) return null;

  return (
    <div className="card-tile p-5 border-emerald/40">
      <div className="flex items-center justify-between border-b border-line pb-2 mb-3">
        <h3 className="font-mono text-xs uppercase tracking-widest text-gold">📰 Actus Mihawk</h3>
        <Link href="/deck-profile" className="text-[10px] font-mono text-emerald-bright hover:underline">
          Tout voir →
        </Link>
      </div>
      <div className="space-y-3">
        {latest.map((n) => (
          <div key={n.title} className="bg-panel2 rounded-lg p-3">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span
                className={`badge text-[9px] ${
                  n.confidence === "Résultat de tournoi"
                    ? "badge-green"
                    : n.confidence === "Confirmé (révélation officielle)"
                      ? "badge-green"
                      : "badge-gold"
                }`}
              >
                {n.confidence}
              </span>
              <span className="text-[10px] font-mono text-steel/50">{n.date}</span>
            </div>
            <div className="text-xs font-mono text-white">{n.title}</div>
            <div className="text-xs text-steel/70 mt-1">{n.note}</div>
            <div className="text-[10px] text-steel/40 mt-1">Source : {n.source}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StreakAndAchievementsWidget() {
  const [state, setState] = useState<LoadState>("loading");
  const [streak, setStreak] = useState<any>(null);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const d = await fetchWithTimeout("/api/achievements");
      setStreak(d.streak);
      setAchievements(d.achievements ?? []);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (state === "loading") {
    return (
      <div className="card-tile p-5">
        <div className="skeleton h-16" />
      </div>
    );
  }
  if (state === "error") {
    return (
      <div className="card-tile p-5">
        <RetryBlock message="Impossible de charger ta série et tes badges." onRetry={load} />
      </div>
    );
  }

  const unlocked = achievements.filter((a) => a.unlocked);
  // Section 22 — pas 54 objectifs à la fois : 1 mission principale + 2
  // priorités secondaires (ici : les 2 badges les plus proches d'être
  // débloqués) + un accès vers la liste complète.
  const nextUp = achievements
    .filter((a) => !a.unlocked)
    .slice(0, 2);
  const visibleAchievements = showAll ? achievements : [...unlocked.slice(0, 2), ...nextUp];

  return (
    <div className="card-tile p-5">
      <div className="flex items-center justify-between border-b border-line pb-2 mb-3">
        <h3 className="font-mono text-xs uppercase tracking-widest text-gold">Série & Badges</h3>
        <span className="text-[10px] text-textMuted">{unlocked.length}/{achievements.length} débloqués</span>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="text-5xl font-mono font-bold text-emerald-bright leading-none">
          🔥{streak.currentStreak}
        </div>
        <div className="text-xs text-steel/70">
          <div className="text-sm text-white font-semibold">
            {streak.currentStreak >= 30
              ? "Série incroyable — vraiment impressionnant."
              : streak.currentStreak >= 14
                ? "Deux semaines d'affilée, la régularité paie."
                : streak.currentStreak >= 7
                  ? "Une semaine complète — belle constance."
                  : streak.currentStreak >= 3
                    ? "Ça prend forme, continue comme ça."
                    : streak.currentStreak >= 1
                      ? "C'est parti — construis ta série."
                      : "Prêt à démarrer une série ?"}
          </div>
          <div>
            jour{streak.currentStreak > 1 ? "s" : ""} d'affilée
            {streak.atRisk && <span className="text-gold"> — joue aujourd'hui pour la garder</span>}
            {streak.longestStreak > streak.currentStreak && <span className="text-steel/50"> · record : {streak.longestStreak}</span>}
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        {visibleAchievements.map((a) => (
          <div
            key={a.id}
            className={`rounded-lg p-2.5 border text-xs ${a.unlocked ? "bg-emerald-dim border-emerald text-emerald-bright" : "bg-panel2 border-line text-steel/60"}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono">{a.unlocked ? "✓" : "○"} {a.label}</span>
              {a.progress && !a.unlocked && <span className="text-[10px] text-textMuted">{a.progress}</span>}
            </div>
            <div className="text-[10px] mt-0.5 opacity-80">{a.description}</div>
          </div>
        ))}
      </div>

      {achievements.length > 4 && (
        <button onClick={() => setShowAll((s) => !s)} className="text-xs font-mono text-emerald-bright hover:underline mt-3">
          {showAll ? "Voir moins" : `Voir tous les badges (${achievements.length})`}
        </button>
      )}
    </div>
  );
}

function RetryBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="text-xs text-red-400 flex items-center justify-between gap-2">
      <span>{message}</span>
      <button onClick={onRetry} className="btn text-[10px] py-1 px-2 shrink-0">Réessayer</button>
    </div>
  );
}

function ObjectivesWidget() {
  const [state, setState] = useState<LoadState>("loading");
  const [items, setItems] = useState<any[]>([]);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const d = await fetchWithTimeout("/api/objectives");
      setItems(d.items ?? []);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(id: string, done: boolean) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, done } : it)));
    fetch(`/api/objectives/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ done }) }).catch(() => {});
  }

  const done = items.filter((i) => i.done).length;
  const pending = items.filter((i) => !i.done);

  return (
    <div className="card-tile p-5">
      <h3 className="font-mono text-xs uppercase tracking-widest text-gold mb-3 border-b border-line pb-2">
        Objectifs {state === "ready" && `— ${done} / ${items.length} complétés`}
      </h3>
      {state === "loading" ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-4 w-full" />)}
        </div>
      ) : state === "error" ? (
        <RetryBlock message="Impossible de charger les objectifs." onRetry={load} />
      ) : items.length === 0 ? (
        <div className="text-xs font-mono text-steel/60">Aucun objectif pour l'instant.</div>
      ) : pending.length === 0 ? (
        <div className="text-xs font-mono text-emerald-bright">Tous les objectifs sont cochés 🎉</div>
      ) : (
        <ul className="space-y-1.5">
          {pending.slice(0, 3).map((it) => (
            <li key={it.id} className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={it.done} onChange={(e) => toggle(it.id, e.target.checked)} className="mt-1 shrink-0" />
              <span className="text-white text-xs leading-snug">{it.text}</span>
            </li>
          ))}
        </ul>
      )}
      <Link href="/journal" className="text-xs font-mono text-emerald-bright hover:underline mt-3 inline-block">
        Voir tous les objectifs →
      </Link>
    </div>
  );
}

function SimWinrateWidget() {
  const [state, setState] = useState<LoadState>("loading");
  const [matches, setMatches] = useState<any[]>([]);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const d = await fetchWithTimeout("/api/matches?mode=Simulateur");
      setMatches(d.matches ?? []);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const total = matches.length;
  const wins = matches.filter((m) => m.result === "Victoire").length;
  const losses = total - wins;
  const winPct = total > 0 ? Math.round((wins / total) * 100) : 0;

  return (
    <div className="card-tile p-5">
      <h3 className="font-mono text-xs uppercase tracking-widest text-gold mb-3 border-b border-line pb-2">
        Winrate simulateur
      </h3>
      {state === "loading" ? (
        <div className="skeleton h-24 w-full" />
      ) : state === "error" ? (
        <RetryBlock message="Impossible de charger tes parties." onRetry={load} />
      ) : total === 0 ? (
        <div className="text-xs font-mono text-steel/60">
          Aucune partie en mode Simulateur enregistrée pour l'instant. Logue tes parties dans{" "}
          <Link href="/journal" className="text-emerald-bright hover:underline">le Journal</Link>.
        </div>
      ) : (
        <div className="flex items-center gap-6 flex-wrap">
          <div
            className="w-32 h-32 rounded-full shrink-0"
            style={{ background: `conic-gradient(#36D98B 0% ${winPct}%, #3A1418 ${winPct}% 100%)` }}
          >
            <div className="w-full h-full rounded-full flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-ink flex items-center justify-center">
                <span className="text-lg font-mono text-white">{winPct}%</span>
              </div>
            </div>
          </div>
          <div className="text-sm font-mono space-y-1">
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald inline-block" /> {wins} victoire{wins > 1 ? "s" : ""}</div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-danger inline-block" /> {losses} défaite{losses > 1 ? "s" : ""}</div>
            <div className="text-steel/60 text-xs mt-1">{total} partie{total > 1 ? "s" : ""} au total sur simulateur — échantillon informatif, pas une stat officielle</div>
          </div>
        </div>
      )}
    </div>
  );
}
