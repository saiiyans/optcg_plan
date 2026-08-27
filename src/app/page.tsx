"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { WEEKS, TOURNAMENT_DATE } from "@/lib/planningData";
import { computeGameCounterStats } from "@/lib/gameCounter";
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

export default function HomePage() {
  const daysLeft = useMemo(() => {
    const diff = Math.ceil((new Date(TOURNAMENT_DATE).getTime() - Date.now()) / 86400000);
    return diff >= 0 ? diff : 0;
  }, []);

  const currentWeek = useMemo(() => {
    const todayISO = new Date().toISOString().slice(0, 10);
    const past = WEEKS.filter((w) => w.startDate <= todayISO);
    return past.length ? past[past.length - 1] : WEEKS[0];
  }, []);

  const dailyTarget = Math.round((currentWeek.sim + currentWeek.bout) / 7);

  return (
    <div className="space-y-6">
      {/* EN-TÊTE (refonte — style Nakama Companion, cohérent avec
          Cartes/Matchups/Tier List) */}
      <div className="pt-1 pb-1">
        <span className="eyebrow-flame">✦ One Piece TCG · Espace de coaching</span>
        <h1 className="mt-1.5 text-3xl sm:text-4xl font-extrabold tracking-tight text-ivory leading-[1.05]">
          Prépare <span className="text-flame-gradient italic">chaque tournoi.</span>
        </h1>
        <p className="text-sm text-steel/70 mt-2 max-w-xl">
          Entraînement, cartes, matchups et suivi de progression — tout au même endroit.
        </p>
      </div>

      {/* HERO — un seul prochain pas évident, jamais 7 widgets à interpréter
          en même temps. Le compte à rebours tournoi + la priorité du jour du
          coach + un seul bouton d'action fusionnent ici ; tout le reste
          (stats détaillées, actus, objectifs...) reste disponible juste en
          dessous, en second plan visuel plutôt qu'à égalité. */}
      <CoachHero daysLeft={daysLeft} currentWeek={currentWeek} />

      <StreakAndAchievementsWidget />

      <div>
        <h2 className="text-xs font-mono uppercase tracking-widest text-steel/50 mb-3 pt-2 border-t border-line">Vue d'ensemble</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <CoachDiagnosticWidget />
          <GameCounterWidget />
          <TrainingWidget dailyTarget={dailyTarget} weekTarget={currentWeek.sim + currentWeek.bout} />
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

/** Message du coach — court, direct, ton encourageant. Jamais de chiffre
 * froid sans phrase autour : la donnée existe déjà ailleurs sur la page,
 * ici c'est la voix qui doit motiver à jouer la prochaine partie. */
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

function CoachHero({ daysLeft, currentWeek }: { daysLeft: number; currentWeek: { n: number; range: string } }) {
  const [state, setState] = useState<LoadState>("loading");
  const [mission, setMission] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [streak, setStreak] = useState<any>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [coach, achievements] = await Promise.all([
        fetchWithTimeout("/api/coach/today"),
        fetchWithTimeout("/api/achievements"),
      ]);
      setMission(coach.mission);
      setProgress(coach.progress);
      setStreak(achievements.streak);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="card-tile p-6 border-emerald/40">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-gold">Tournoi One Piece Card Game · Semaine {currentWeek.n}</div>
          <div className="text-white text-sm font-mono mt-0.5">{currentWeek.range}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-3xl font-mono font-bold text-gold">{daysLeft}</div>
          <div className="text-[10px] uppercase tracking-wider text-steel/60">jours restants</div>
        </div>
      </div>

      {state === "loading" ? (
        <div className="space-y-2">
          <div className="skeleton h-6 w-3/4" />
          <div className="skeleton h-4 w-1/2" />
        </div>
      ) : state === "error" ? (
        <RetryBlock message="Impossible de charger ton coach." onRetry={load} />
      ) : (
        <p className="text-lg text-ivory font-semibold leading-snug">
          🧑‍🏫{" "}
          {coachLine({
            hasData: !!mission?.hasData,
            mission: mission?.mission,
            streakDays: streak?.currentStreak,
            atRisk: streak?.atRisk,
            progressDelta: progress?.hasData ? progress.delta : undefined,
          })}
        </p>
      )}

      <Link href="/journal" className="btn btn-primary mt-4 inline-block">
        Enregistrer une partie →
      </Link>
    </div>
  );
}

type LoadState = "loading" | "ready" | "error";

/** Diagnostic complet — la version détaillée du message court du Hero
 * ci-dessus (forces, faiblesse, progression). Volontairement en second plan
 * (dans "Vue d'ensemble") : utile pour creuser, pas la première chose à lire
 * en arrivant. */
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
              <div className="text-xs font-mono text-steel/60">Données insuffisantes — {strengths?.reason}</div>
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
              <div className="text-xs font-mono text-steel/60">Données insuffisantes — {weakness?.reason}</div>
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
              <div className="text-xs font-mono text-steel/60">Données insuffisantes — {progress?.reason}</div>
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

/** Compact — les 2 actus Mihawk les plus récentes, visibles dès l'accueil
 * même si on ne va jamais consulter la fiche complète sur Deck Profile.
 * Données statiques (voir MIHAWK_NEWS), pas de fetch nécessaire. */
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
  const visibleAchievements = showAll ? achievements : achievements.slice(0, 4);

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

function GameCounterWidget() {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [stats, setStats] = useState<ReturnType<typeof computeGameCounterStats> | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const d = await fetchWithTimeout("/api/matches");
      const matches = d.matches ?? [];
      setStats(computeGameCounterStats(matches));
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (state === "loading") {
    return <div className="card-tile p-5"><div className="skeleton h-20 w-full" /></div>;
  }
  if (state === "error" || !stats) {
    return (
      <div className="card-tile p-5 flex items-center justify-between">
        <span className="text-xs text-red-400">Impossible de charger le compteur de parties.</span>
        <button onClick={load} className="btn text-xs py-1.5 px-3">Réessayer</button>
      </div>
    );
  }

  const pct = stats.totalTarget > 0 ? Math.min(100, Math.round((stats.totalPlayed / stats.totalTarget) * 100)) : 0;
  const statusLabel = stats.status === "avance" ? "En avance" : stats.status === "retard" ? "En retard" : "Dans le rythme";
  const statusColor = stats.status === "avance" ? "text-emerald-bright" : stats.status === "retard" ? "text-red-400" : "text-gold";

  return (
    <div className="card-tile p-5">
      <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-gold">Compteur de parties</div>
          <div className="text-3xl md:text-4xl font-mono font-bold text-white mt-1">
            {stats.totalPlayed} <span className="text-steel/50 text-lg">/ {stats.totalTarget}</span>
          </div>
          <div className="text-xs text-steel/60 mt-0.5">{stats.remaining} parties restantes avant le tournoi</div>
        </div>
        <span className={`badge ${stats.status === "avance" ? "badge-green" : stats.status === "retard" ? "badge-red" : "badge-gold"} shrink-0`}>
          {statusLabel}
        </span>
      </div>
      <div className="w-full h-2 bg-panel2 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-dim transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs font-mono text-steel/60">
        <span>Semaine {stats.currentWeekN} : {stats.playedThisWeek} / {stats.weekTarget}</span>
        <span>Attendu à date : {stats.expectedByToday}</span>
        <span>Rythme nécessaire : ~{stats.dailyPaceNeeded}/jour ({stats.daysLeft}j restants)</span>
      </div>
    </div>
  );
}

function TrainingWidget({ dailyTarget, weekTarget }: { dailyTarget: number; weekTarget: number }) {
  const [state, setState] = useState<LoadState>("loading");
  const [gamesToday, setGamesToday] = useState(0);
  const [gamesThisWeek, setGamesThisWeek] = useState(0);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const d = await fetchWithTimeout("/api/matches");
      const matches = d.matches ?? [];
      const todayISO = new Date().toISOString().slice(0, 10);
      setGamesToday(matches.filter((m: any) => m.date === todayISO).length);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 6);
      const weekAgoISO = weekAgo.toISOString().slice(0, 10);
      setGamesThisWeek(matches.filter((m: any) => m.date >= weekAgoISO && m.date <= todayISO).length);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pct = dailyTarget > 0 ? Math.min(100, Math.round((gamesToday / dailyTarget) * 100)) : 0;

  return (
    <div className="card-tile p-5">
      <h3 className="font-mono text-xs uppercase tracking-widest text-gold mb-3 border-b border-line pb-2">Entraînement</h3>
      {state === "error" ? (
        <RetryBlock message="Impossible de charger tes parties." onRetry={load} />
      ) : (
        <>
          <div className="flex items-end justify-between mb-2">
            <div>
              <div className="text-3xl font-mono font-bold text-white">
                {state === "loading" ? "…" : gamesToday} <span className="text-steel/50 text-base">/ {dailyTarget}</span>
              </div>
              <div className="text-[10px] uppercase tracking-wider text-steel/60">parties aujourd'hui (objectif du jour)</div>
            </div>
          </div>
          <div className="w-full h-2 bg-panel2 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-dim transition-all" style={{ width: `${state === "loading" ? 0 : pct}%` }} />
          </div>
          <div className="text-xs font-mono text-steel/60 mt-3">
            Cette semaine : <span className="text-white">{state === "loading" ? "…" : gamesThisWeek}</span> / {weekTarget} parties visées
          </div>
        </>
      )}
      <Link href="/journal" className="text-xs font-mono text-emerald-bright hover:underline mt-2 inline-block">
        Logger une partie →
      </Link>
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
    try {
      await fetchWithTimeout(`/api/objectives/${id}`);
    } catch {
      // Optimiste : on ne bloque pas l'UI pour un échec de sauvegarde isolé.
    }
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
          {pending.slice(0, 5).map((it) => (
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
          <Link href="/journal" className="text-emerald-bright hover:underline">Préparation Tournoi</Link>.
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
            <div className="text-steel/60 text-xs mt-1">{total} partie{total > 1 ? "s" : ""} au total sur simulateur</div>
          </div>
        </div>
      )}
    </div>
  );
}
