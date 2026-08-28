"use client";

import { useEffect, useState } from "react";
import { OpponentLeaderBadge } from "@/components/OpponentLeaderBadge";
import { MIN_SAMPLE_SIZE } from "@/lib/config";

/**
 * Statistiques de performance personnelle (parties enregistrées dans le
 * Journal) — extrait de prep/page.tsx pour être réutilisable ailleurs
 * (Dashboard "Stats", désormais la rubrique principale) sans dupliquer la
 * logique. Toujours utilisé avec CoachBilanSection à proximité.
 */

export function DataInsufficient({ reason }: { reason?: string }) {
  return <div className="text-xs font-mono text-steel/60">Données insuffisantes — {reason}</div>;
}

/** "Vue d'ensemble" (parties, winrate global, winrate par deck perso) +
 * "Bilan par leader adverse" (winrate par matchup, triable par pire d'abord). */
export function MatchesOverview() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Uniquement l'entraînement officiel — cette vue prétend montrer un
    // "bilan par leader adverse" fiable, jamais mélangée silencieusement à
    // la Phase test (section 1/13).
    fetch("/api/matches?phase=official_training")
      .then((r) => r.json())
      .then((d) => {
        setMatches(d.matches ?? []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const total = matches.length;
  const wins = matches.filter((m) => m.result === "Victoire").length;
  const winrate = total ? Math.round((wins / total) * 100) : 0;

  const byDeck: Record<string, { t: number; w: number }> = {};
  matches.forEach((m) => {
    byDeck[m.myDeck] = byDeck[m.myDeck] || { t: 0, w: 0 };
    byDeck[m.myDeck].t++;
    if (m.result === "Victoire") byDeck[m.myDeck].w++;
  });

  const byOpp: Record<string, { t: number; w: number; l: number }> = {};
  matches.forEach((m) => {
    byOpp[m.opponentLeader] = byOpp[m.opponentLeader] || { t: 0, w: 0, l: 0 };
    byOpp[m.opponentLeader].t++;
    if (m.result === "Victoire") byOpp[m.opponentLeader].w++;
    else byOpp[m.opponentLeader].l++;
  });
  const oppRows = Object.entries(byOpp)
    .map(([opp, d]) => ({ opp, ...d, wr: Math.round((d.w / d.t) * 100) }))
    .sort((a, b) => a.wr - b.wr);

  // Seuil d'échantillon fiable (source unique, src/lib/config.ts) — un
  // matchup en dessous n'est jamais présenté comme "à surveiller", juste
  // affiché avec son propre compte pour rester transparent.
  const threats = oppRows.filter((r) => r.t >= MIN_SAMPLE_SIZE && r.wr < 50);

  if (!loaded) return <div className="card-tile rounded-sm p-5"><div className="skeleton h-20" /></div>;

  return (
    <>
      <div className="card-tile rounded-sm p-5">
        <h3 className="font-mono text-xs uppercase tracking-widest text-gold mb-1 border-b border-line pb-2">Vue d'ensemble</h3>
        <p className="text-[11px] text-steel/50 mb-3">Entraînement officiel uniquement.</p>
        <div className="flex gap-4 flex-wrap">
          <div className="bg-panel2 rounded p-3 text-center min-w-[100px]"><div className="text-2xl font-mono text-emerald-bright">{total}</div><div className="text-[10px] uppercase text-steel/60">Parties</div></div>
          <div className="bg-panel2 rounded p-3 text-center min-w-[100px]">
            <div className="text-2xl font-mono text-emerald-bright">{total > 0 ? `${winrate}%` : "—"}</div>
            <div className="text-[10px] uppercase text-steel/60">Winrate global {total > 0 && `(${wins}/${total})`}</div>
          </div>
          {Object.entries(byDeck).map(([deck, d]) => (
            <div key={deck} className="bg-panel2 rounded p-3 text-center min-w-[100px]">
              <div className="text-2xl font-mono text-gold">{Math.round((d.w / d.t) * 100)}%</div>
              <div className="text-[10px] uppercase text-steel/60">{deck} ({d.w}/{d.t})</div>
            </div>
          ))}
        </div>
        {total < MIN_SAMPLE_SIZE && (
          <div className="text-xs font-mono text-steel/60 mt-3">
            Échantillon insuffisant — encore {MIN_SAMPLE_SIZE - total} partie(s) officielle(s) avant que les tendances par adversaire deviennent fiables.
          </div>
        )}
      </div>

      <div className="card-tile rounded-sm p-5">
        <h3 className="font-mono text-xs uppercase tracking-widest text-gold mb-3 border-b border-line pb-2">Bilan par leader adverse</h3>
        {threats.length > 0 && (
          <div className="text-xs font-mono text-red-400 mb-2">
            À surveiller (≥{MIN_SAMPLE_SIZE} parties, winrate &lt;50%) : {threats.map((t) => t.opp).join(", ")}
          </div>
        )}
        {oppRows.length === 0 ? (
          <div className="text-steel/60 text-sm font-mono">Pas encore de données.</div>
        ) : (
          <div className="table-scroll">
          <table className="w-full text-sm">
            <thead><tr className="text-[10px] font-mono uppercase text-steel/60 border-b border-line"><th className="text-left py-1">Leader</th><th>Parties</th><th>V</th><th>D</th><th>Winrate</th></tr></thead>
            <tbody>
              {oppRows.map((r) => (
                <tr key={r.opp} className="border-b border-line/50">
                  <td className={`py-1.5 ${r.t >= MIN_SAMPLE_SIZE && r.wr < 45 ? "text-red-400" : r.t >= MIN_SAMPLE_SIZE && r.wr > 65 ? "text-emerald-bright" : "text-white"}`}>
                    <OpponentLeaderBadge label={r.opp} size={20} />
                  </td>
                  <td className="text-center">{r.t}</td><td className="text-center">{r.w}</td><td className="text-center">{r.l}</td>
                  <td className={`text-center font-mono ${r.t >= MIN_SAMPLE_SIZE && r.wr < 45 ? "text-red-400" : r.t >= MIN_SAMPLE_SIZE && r.wr > 65 ? "text-emerald-bright" : "text-white"}`}>
                    {r.wr}%{r.t < MIN_SAMPLE_SIZE && <span className="text-steel/40 font-normal" title={`Moins de ${MIN_SAMPLE_SIZE} parties — tendance encore peu fiable`}>*</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {oppRows.some((r) => r.t < MIN_SAMPLE_SIZE) && (
            <div className="text-[10px] text-steel/50 mt-2">* Moins de {MIN_SAMPLE_SIZE} parties contre ce Leader — échantillon insuffisant, winrate à prendre avec précaution.</div>
          )}
          </div>
        )}
      </div>
    </>
  );
}

/** Sections Premier/Second, Mulligan, Mihawk — effet Leader, Forme
 * récente / série, Style de jeu — erreurs fréquentes. Consomme
 * /api/stats/personal (src/lib/personalStats.ts). */
export function PersonalStatsSection() {
  const [stats, setStats] = useState<any>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  // Fiabilité des stats (section 1/13) — l'entraînement officiel est le
  // filtre par défaut ; "phase test" et "toutes les phases" restent
  // disponibles explicitement, jamais mélangés silencieusement.
  const [phase, setPhase] = useState<"official_training" | "test" | "all">("official_training");

  useEffect(() => {
    setState("loading");
    fetch(`/api/stats/personal?phase=${phase}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) throw new Error();
        setStats(d.stats);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, [phase]);

  const phaseSelector = (
    <div className="flex items-center gap-2 mb-3">
      <label className="text-[10px] font-mono uppercase text-steel/60">Phase</label>
      <select className="input text-xs py-1.5" value={phase} onChange={(e) => setPhase(e.target.value as any)}>
        <option value="official_training">Entraînement officiel</option>
        <option value="test">Phase test</option>
        <option value="all">Toutes les phases</option>
      </select>
    </div>
  );

  if (state === "loading") return <div className="card-tile rounded-sm p-5">{phaseSelector}<div className="skeleton h-20" /></div>;
  if (state === "error" || !stats) return <div className="card-tile rounded-sm p-5 text-xs text-danger">{phaseSelector}Impossible de charger les statistiques personnelles.</div>;

  return (
    <>
      <div className="card-tile rounded-sm p-5">
        {phaseSelector}
        <div className="text-xs font-mono text-steel/70">
          {stats.general.total} partie{stats.general.total > 1 ? "s" : ""}
          {" "}({phase === "official_training" ? "entraînement officiel" : phase === "test" ? "phase test" : "toutes phases confondues"})
          {" • "}{stats.general.documented} documentée{stats.general.documented > 1 ? "s" : ""}
          {" • confiance "}{stats.general.documented >= 20 ? "élevée" : stats.general.documented >= 5 ? "moyenne" : "faible"}
        </div>
      </div>

      {/* Forme récente / série — nouveau : winrate sur les 10 dernières
          parties comparé au global, série de victoires/défaites en cours,
          meilleure série de victoires jamais enregistrée. */}
      <div className="card-tile rounded-sm p-5">
        <h3 className="font-mono text-xs uppercase tracking-widest text-gold mb-3 border-b border-line pb-2">Forme récente</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div className="bg-panel2 rounded p-3 text-center">
            <div className="text-lg font-mono text-emerald-bright">{stats.general.recentForm ? `${stats.general.recentForm.winrate}%` : "—"}</div>
            <div className="text-[10px] uppercase text-steel/60">10 dernières parties</div>
          </div>
          <div className={`bg-panel2 rounded p-3 text-center`}>
            <div className={`text-lg font-mono ${stats.general.currentStreak > 0 ? "text-emerald-bright" : stats.general.currentStreak < 0 ? "text-red-400" : "text-steel/60"}`}>
              {stats.general.currentStreak === 0 ? "—" : stats.general.currentStreak > 0 ? `${stats.general.currentStreak}V` : `${Math.abs(stats.general.currentStreak)}D`}
            </div>
            <div className="text-[10px] uppercase text-steel/60">Série en cours</div>
          </div>
          <div className="bg-panel2 rounded p-3 text-center">
            <div className="text-lg font-mono text-gold">{stats.general.bestWinStreak || "—"}</div>
            <div className="text-[10px] uppercase text-steel/60">Meilleure série (V)</div>
          </div>
          <div className="bg-panel2 rounded p-3 text-center">
            <div className="text-lg font-mono text-white">{stats.general.avgDurationMinutes ?? "—"}</div>
            <div className="text-[10px] uppercase text-steel/60">Durée moy. (min)</div>
          </div>
        </div>
      </div>

      <div className="card-tile rounded-sm p-5">
        <h3 className="font-mono text-xs uppercase tracking-widest text-gold mb-3 border-b border-line pb-2">Premier / Second</h3>
        {!stats.firstSecond.hasData ? (
          <DataInsufficient reason={stats.firstSecond.reason} />
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-panel2 rounded p-3 text-center">
              <div className="text-xl font-mono text-emerald-bright">{stats.firstSecond.first.winrate}%</div>
              <div className="text-[10px] uppercase text-steel/60">Premier ({stats.firstSecond.first.total})</div>
              {stats.firstSecond.first.avgDuration && <div className="text-[10px] text-steel/50 mt-1">~{stats.firstSecond.first.avgDuration} min en moyenne</div>}
            </div>
            <div className="bg-panel2 rounded p-3 text-center">
              <div className="text-xl font-mono text-gold">{stats.firstSecond.second.winrate}%</div>
              <div className="text-[10px] uppercase text-steel/60">Second ({stats.firstSecond.second.total})</div>
              {stats.firstSecond.second.avgDuration && <div className="text-[10px] text-steel/50 mt-1">~{stats.firstSecond.second.avgDuration} min en moyenne</div>}
            </div>
          </div>
        )}
      </div>

      <div className="card-tile rounded-sm p-5">
        <h3 className="font-mono text-xs uppercase tracking-widest text-gold mb-3 border-b border-line pb-2">Mulligan</h3>
        {!stats.mulligan.hasData ? (
          <DataInsufficient reason={stats.mulligan.reason} />
        ) : (
          <div className="space-y-2 text-sm">
            <div>Taux de mulligan : <span className="text-white font-mono">{stats.mulligan.mulliganRate}%</span></div>
            {stats.mulligan.winrateWithMulligan !== undefined && <div>Winrate avec mulligan : <span className="text-white font-mono">{stats.mulligan.winrateWithMulligan}%</span></div>}
            {stats.mulligan.winrateWithoutMulligan !== undefined && <div>Winrate sans mulligan : <span className="text-white font-mono">{stats.mulligan.winrateWithoutMulligan}%</span></div>}
            {stats.mulligan.byHandQuality && Object.keys(stats.mulligan.byHandQuality).length > 0 && (
              <div className="pt-2 border-t border-line mt-2">
                <div className="text-[10px] uppercase text-steel/60 mb-1">Par qualité de main</div>
                {Object.entries(stats.mulligan.byHandQuality).map(([q, d]: [string, any]) => (
                  <div key={q} className="text-xs text-steel/80">{q} — {d.winrate}% ({d.total} partie{d.total > 1 ? "s" : ""})</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card-tile rounded-sm p-5">
        <h3 className="font-mono text-xs uppercase tracking-widest text-gold mb-3 border-b border-line pb-2">Mihawk — effet Leader</h3>
        {!stats.mihawk.hasData ? (
          <DataInsufficient reason={stats.mihawk.reason} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="bg-panel2 rounded p-3 text-center">
              <div className="text-lg font-mono text-emerald-bright">{stats.mihawk.avgActivations ?? "—"}</div>
              <div className="text-[10px] uppercase text-steel/60">Activations / partie</div>
            </div>
            <div className="bg-panel2 rounded p-3 text-center">
              <div className="text-lg font-mono text-gold">{stats.mihawk.avgFirstCost5Turn ?? "—"}</div>
              <div className="text-[10px] uppercase text-steel/60">Tour 1er coût 5+</div>
            </div>
            <div className="bg-panel2 rounded p-3 text-center">
              <div className="text-lg font-mono text-red-400">{stats.mihawk.effectForgottenRate ?? "—"}%</div>
              <div className="text-[10px] uppercase text-steel/60">Effet oublié</div>
            </div>
            <div className="bg-panel2 rounded p-3 text-center">
              <div className="text-lg font-mono text-red-400">{stats.mihawk.effectTooEarlyRate ?? "—"}%</div>
              <div className="text-[10px] uppercase text-steel/60">Activé trop tôt</div>
            </div>
          </div>
        )}
      </div>

      <div className="card-tile rounded-sm p-5">
        <h3 className="font-mono text-xs uppercase tracking-widest text-gold mb-3 border-b border-line pb-2">Style de jeu — erreurs fréquentes</h3>
        {!stats.style.hasData ? (
          <DataInsufficient reason={stats.style.reason} />
        ) : (
          <div className="space-y-1">
            {stats.style.topMistakes.map((m: any) => (
              <div key={m.mistake} className="flex justify-between text-sm">
                <span className="text-steel/80">{m.mistake}</span>
                <span className="text-white font-mono">{m.count}×</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/** Bilan Coach — synthèse courte générée à partir des mêmes données
 * (voir src/lib/coachBilan.ts / /api/coach/bilan). */
export function CoachBilanSection() {
  const [bilan, setBilan] = useState<any>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    fetch("/api/coach/bilan")
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) throw new Error();
        setBilan(d.bilan);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, []);

  if (state === "loading") return <div className="card-tile rounded-sm p-5 border-emerald/40"><div className="skeleton h-16" /></div>;
  if (state === "error" || !bilan) return null;

  if (!bilan.hasData) {
    return (
      <div className="card-tile rounded-sm p-5 border-emerald/40">
        <h3 className="font-mono text-xs uppercase tracking-widest text-gold mb-2 border-b border-line pb-2">🧑‍🏫 Bilan Coach</h3>
        <DataInsufficient reason={bilan.reason} />
      </div>
    );
  }

  const badgeFor = (level: string) =>
    level === "Tendance suffisamment observée" ? "badge-green" : level === "Tendance provisoire" ? "badge-gold" : "badge";

  return (
    <div className="card-tile rounded-sm p-5 border-emerald/40">
      <h3 className="font-mono text-xs uppercase tracking-widest text-gold mb-3 border-b border-line pb-2">🧑‍🏫 Bilan Coach — {bilan.sampleSize} parties</h3>
      <div className="space-y-3 text-sm">
        {bilan.progress && (
          <div>
            <span className={`badge ${badgeFor(bilan.progress.level)} mr-2`}>{bilan.progress.level}</span>
            Progrès observé : <span className="text-white font-mono">{bilan.progress.recentWinrate}%</span> sur les 10 dernières parties, contre {bilan.progress.previousWinrate}% avant — {bilan.progress.delta >= 0 ? "↑" : "↓"} {Math.abs(bilan.progress.delta)} points.
          </div>
        )}
        {bilan.mostFrequentMistake && (
          <div>
            <span className={`badge ${badgeFor(bilan.mostFrequentMistake.level)} mr-2`}>{bilan.mostFrequentMistake.level}</span>
            Erreur la plus fréquente : <span className="text-white">{bilan.mostFrequentMistake.mistake}</span> ({bilan.mostFrequentMistake.count} fois)
          </div>
        )}
        {bilan.hardestMatchup && (
          <div>
            <span className={`badge ${badgeFor(bilan.hardestMatchup.level)} mr-2`}>{bilan.hardestMatchup.level}</span>
            Matchup le plus difficile : <OpponentLeaderBadge label={bilan.hardestMatchup.opponent} size={18} /> ({bilan.hardestMatchup.winrate}% sur {bilan.hardestMatchup.sampleSize})
          </div>
        )}
        {bilan.firstVsSecond && (
          <div>
            <span className={`badge ${badgeFor(bilan.firstVsSecond.level)} mr-2`}>{bilan.firstVsSecond.level}</span>
            Premier {bilan.firstVsSecond.firstWinrate}% vs Second {bilan.firstVsSecond.secondWinrate}%
          </div>
        )}
        {bilan.avgDuration && <div>Durée moyenne : <span className="text-white font-mono">{bilan.avgDuration} min</span></div>}
        {bilan.usefulCard && (
          <div>
            <span className={`badge ${badgeFor(bilan.usefulCard.level)} mr-2`}>{bilan.usefulCard.level}</span>
            Carte souvent utile : <span className="text-white">{bilan.usefulCard.card}</span> ({bilan.usefulCard.count} fois)
          </div>
        )}
        {bilan.deadCard && (
          <div>
            <span className={`badge ${badgeFor(bilan.deadCard.level)} mr-2`}>{bilan.deadCard.level}</span>
            Carte souvent morte : <span className="text-white">{bilan.deadCard.card}</span> ({bilan.deadCard.count} fois)
          </div>
        )}
        {bilan.nextTrainingGoal && (
          <div className="pt-2 border-t border-line mt-2 text-emerald-bright">🎯 {bilan.nextTrainingGoal}</div>
        )}
      </div>
    </div>
  );
}
