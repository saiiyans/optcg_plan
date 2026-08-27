"use client";
import { useState } from "react";
import { OPTCG_RESOURCES, MATCHUP_GUIDES, META_LEADER_SNAPSHOT, META_SNAPSHOT_SOURCE } from "@/lib/matchupGuide";
import { getMergedMatchups } from "@/lib/matchupMerge";
import { DIFFICULTY_LABEL } from "@/lib/matchupCenter";
import { LeaderImage } from "@/components/LeaderImage";
import { OpponentLeaderBadge } from "@/components/OpponentLeaderBadge";
import { MetaMatchupGrid } from "@/components/MetaMatchupGrid";
import { CardThumb } from "@/components/CardThumb";

// --- /matchups — page unique de stratégie par leader adverse. Fusionne ce
// qui était éparpillé sur 3 pages (Matchup Center, Matchups, et la section
// "Menaces de chaque matchup" de Révisions) : mêmes infos, un seul endroit,
// pas de dataset dupliqué à jour incertaine. Les deux sources d'origine
// (plans de jeu perso détaillés vs fiches sourcées tier lists/stats
// publiques) restent visibles et attribuées séparément — voir
// src/lib/matchupMerge.ts pour la logique de correspondance manuelle.

const GUIDE_BADGE: Record<string, string> = {
  Favorable: "badge-green",
  Défavorable: "badge-red",
  Serré: "badge-gold",
  "À tester": "badge-gray",
};

export default function MatchupsPage() {
  const [journalStats, setJournalStats] = useState<Record<string, { wins: number; losses: number; total: number }> | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [syncResult, setSyncResult] = useState<{ inserted: number; skipped: number; error?: string } | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(slug: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  async function recomputeFromJournal() {
    const res = await fetch("/api/matches");
    const data = await res.json();
    const matches: any[] = data.matches ?? [];
    const stats: Record<string, { wins: number; losses: number; total: number }> = {};
    for (const m of matches) {
      const key = m.opponentLeader.trim();
      stats[key] = stats[key] || { wins: 0, losses: 0, total: 0 };
      stats[key].total++;
      if (m.result === "Victoire") stats[key].wins++;
      else stats[key].losses++;
    }
    setJournalStats(stats);
    setLastRefresh(new Date());
  }

  async function refreshFromJournal() {
    setRefreshing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/matches/refresh-kaizoku", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setSyncResult({ inserted: 0, skipped: 0, error: data?.error ?? `Erreur ${res.status}` });
      } else {
        setSyncResult({ inserted: data.inserted ?? 0, skipped: data.skipped ?? 0 });
      }
    } catch (e: any) {
      setSyncResult({ inserted: 0, skipped: 0, error: e?.message ?? "Erreur réseau." });
    }
    await recomputeFromJournal();
    setRefreshing(false);
  }

  // Cherche une correspondance approximative entre le nom d'un adversaire
  // (libellé du guide ou du plan de jeu) et une clé du journal, qui peut
  // être saisie légèrement différemment ("Enel", "Purple Enel", "Enel OP15-058"...).
  function findJournalMatch(opponentLabel: string) {
    if (!journalStats) return null;
    const shortName = opponentLabel.split(" (")[0].toLowerCase().trim();
    const key = Object.keys(journalStats).find(
      (k) => k.toLowerCase().includes(shortName) || shortName.includes(k.toLowerCase())
    );
    return key ? journalStats[key] : null;
  }

  const { merged, guideOnly } = getMergedMatchups();
  const guide = MATCHUP_GUIDES.find((g) => g.leaderKey === "mihawk");

  return (
    <div className="space-y-6">
      <div className="pt-1 pb-1">
        <span className="eyebrow-flame">✦ One Piece TCG · Matchups</span>
        <h1 className="mt-1.5 text-3xl sm:text-4xl md:text-[2.75rem] font-extrabold tracking-tight text-ivory leading-[1.05]">
          Bats <span className="text-flame-gradient italic">chaque adversaire.</span>
        </h1>
        <p className="text-sm text-steel/70 mt-2 max-w-xl">
          Un plan de jeu clair pour chaque leader adverse — méta communautaire, fiches détaillées et ta propre donnée de jeu, tout au même endroit.
        </p>
      </div>

      {/* CLASSEMENT MÉTA ACTUELLE — snapshot statique (pas de rafraîchissement
          auto) capturé sur cardkaizoku.com le 27/08/2026, pour répondre à
          "quels leaders je vais vraiment croiser en tournoi" avec le taux de
          jeu réel du format en cours. Complète la grille leader-vs-leader
          juste en dessous (MetaMatchupGrid, qui elle vient d'opdecks.xyz et
          se rafraîchit sur clic) plutôt que de la remplacer : l'une montre
          QUI tu vas croiser, l'autre montre QUI bat QUI. */}
      <div className="card-tile rounded-sm p-4">
        <div className="text-[11px] font-mono uppercase tracking-widest text-gold mb-0.5">
          Classement méta actuelle — qui tu vas vraiment croiser
        </div>
        <div className="text-[11px] text-steel/50 mb-3">Snapshot du 27 août 2026 · pas de rafraîchissement automatique</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-separate border-spacing-y-1">
            <thead>
              <tr className="text-[10px] text-steel/50 uppercase tracking-wider">
                <th className="pr-2 font-normal">#</th>
                <th className="pr-2 font-normal">Leader</th>
                <th className="pr-2 font-normal text-right">Taux de jeu</th>
                <th className="pr-2 font-normal text-right">Winrate pondéré</th>
              </tr>
            </thead>
            <tbody>
              {META_LEADER_SNAPSHOT.map((l) => {
                const isMihawk = l.cardNumber === "OP14-020";
                return (
                  <tr key={l.cardNumber} className={isMihawk ? "bg-flame/10" : "bg-panel2"}>
                    <td className="px-2 py-1.5 rounded-l font-mono text-steel/60">
                      {l.rank}
                      {l.trend === "up" && <span className="text-emerald-bright ml-0.5">↑</span>}
                      {l.trend === "down" && <span className="text-red-400 ml-0.5">↓</span>}
                    </td>
                    <td className={`px-2 py-1.5 font-mono ${isMihawk ? "text-flame font-bold" : "text-white"}`}>
                      {l.name} <span className="text-steel/40">({l.cardNumber})</span>
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums text-steel/80">{l.playRate.toFixed(2)}%</td>
                    <td className="px-2 py-1.5 rounded-r text-right font-mono tabular-nums text-steel/80">{l.wtdWinRate.toFixed(2)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="text-[10px] text-steel/40 mt-2">
          Source :{" "}
          <a href="https://www.cardkaizoku.com/ranking" target="_blank" rel="noopener noreferrer" className="underline hover:text-steel/70">
            cardkaizoku.com/ranking
          </a>{" "}
          — {META_SNAPSHOT_SOURCE}
        </div>
      </div>

      <MetaMatchupGrid />

      <div className="card-tile p-5">
        <p className="text-sm text-steel/80 mb-3">
          Le but n'est pas de mémoriser des pourcentages, mais de savoir <span className="text-white">quoi faire</span> face
          à chaque archétype avant même de s'asseoir à la table.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={refreshFromJournal} disabled={refreshing} className="btn btn-primary">
            {refreshing ? "Synchronisation..." : "🔄 Rafraîchir depuis mes parties"}
          </button>
          <span className="text-xs font-mono text-steel/60">
            {lastRefresh
              ? `Synchronisé avec Card D. Kaizoku puis recalculé, ${lastRefresh.toLocaleTimeString("fr-FR")}.`
              : "Va chercher tes nouvelles parties sur Card D. Kaizoku, les importe, puis recalcule tes statistiques."}
          </span>
        </div>
        {syncResult && (
          <div className={`text-xs font-mono mt-2 ${syncResult.error ? "text-danger" : "text-emerald-bright"}`}>
            {syncResult.error
              ? `Synchronisation Kaizoku impossible : ${syncResult.error} (stats quand même recalculées depuis le Journal existant.)`
              : `${syncResult.inserted} nouvelle(s) partie(s) importée(s), ${syncResult.skipped} déjà connue(s).`}
          </div>
        )}
      </div>

      {guide && (
        <div className="card-tile p-5">
          <span className="badge badge-green mb-3 inline-flex items-center gap-1.5">
            <LeaderImage leaderKey="mihawk" size={16} />
            Mihawk OP14-020
          </span>
          <p className="text-sm text-white mb-3">{guide.gameplanSummary}</p>
          {guide.keyStats && (
            <div className="bg-panel2 rounded-lg p-3 mb-3 text-xs text-steel/80">
              <span className="text-gold font-mono uppercase text-[10px] tracking-wider">Chiffre sourcé</span>
              <p className="mt-1">{guide.keyStats}</p>
            </div>
          )}
          <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-bright mb-1.5">Points forts</div>
          <ul className="space-y-1">
            {guide.strengths.map((s, i) => (
              <li key={i} className="text-xs font-mono text-steel/80">• {s}</li>
            ))}
          </ul>
          <div className="text-[10px] font-mono text-steel/50 mt-3 pt-3 border-t border-line">{guide.sourceNote}</div>
        </div>
      )}

      {/* PLANS DE JEU DÉTAILLÉS — un plan par adversaire connu, condensé par
          défaut (adversaire + difficulté + priorité d'entraînement), à
          déplier pour le détail complet. Quand les deux sources se
          contredisent, les deux avis restent visibles côte à côte. */}
      <div>
        <h2 className="text-lg font-semibold text-ivory mb-3">Plans de jeu par adversaire</h2>
        <div className="space-y-2">
          {merged.map((m) => {
            const diff = m.center ? DIFFICULTY_LABEL[m.center.difficulty] : null;
            const open = expanded.has(m.slug);
            const real = m.guide ? findJournalMatch(m.guide.opponent) : findJournalMatch(m.opponentLabel);
            return (
              <div key={m.slug} className="card-tile overflow-hidden">
                <button onClick={() => toggle(m.slug)} className="w-full p-4 flex items-center justify-between gap-3 text-left">
                  <div className="flex items-center gap-3 flex-wrap min-w-0">
                    <OpponentLeaderBadge label={m.opponentLabel} size={26} />
                    {diff && <span className={`text-xs font-mono ${diff.color}`}>{diff.icon} {diff.label}</span>}
                    {m.center && <span className="text-[10px] text-gold shrink-0">{"★".repeat(m.center.trainingPriority)}{"☆".repeat(5 - m.center.trainingPriority)}</span>}
                    {m.conflicting && <span className="badge badge-gold text-[9px]">⚠ avis partagés</span>}
                    {real && (
                      <span className="text-[11px] font-mono text-emerald-bright bg-ink/40 rounded px-2 py-0.5">
                        Ta donnée : {real.wins}V-{real.losses}D ({Math.round((real.wins / real.total) * 100)}%)
                      </span>
                    )}
                  </div>
                  <span className="text-steel/50 text-xs shrink-0">{open ? "▲" : "▼"}</span>
                </button>

                {open && (
                  <div className="px-4 pb-4 pt-1 border-t border-line space-y-4">
                    {m.center && (
                      <div>
                        <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-bright mb-1">Objectif principal</div>
                        <div className="text-sm font-mono text-white mb-3">{m.center.primaryObjective}</div>

                        <div className="text-[11px] font-mono uppercase tracking-wider text-gold mb-1">Pourquoi</div>
                        <p className="text-sm text-steel/90 mb-3">{m.center.why}</p>

                        <div className="text-[11px] font-mono uppercase tracking-wider text-gold mb-1">Plan</div>
                        <p className="text-sm text-steel/90 mb-3">{m.center.plan}</p>

                        {m.center.keyCards.length > 0 && (
                          <>
                            <div className="text-[11px] font-mono uppercase tracking-wider text-gold mb-1">Cartes clés</div>
                            <div className="flex flex-wrap gap-2 mb-3">
                              {m.center.keyCards.map((c) => <CardThumb key={c} cardNumber={c} size={52} />)}
                            </div>
                          </>
                        )}

                        {m.center.dontDo.length > 0 && (
                          <>
                            <div className="text-[11px] font-mono uppercase tracking-wider text-red-400 mb-1">À ne pas faire</div>
                            <ul className="mb-3 space-y-0.5">
                              {m.center.dontDo.map((d) => <li key={d} className="text-sm text-steel/80">❌ {d}</li>)}
                            </ul>
                          </>
                        )}

                        <div className="text-[11px] font-mono uppercase tracking-wider text-gold mb-1">Condition de victoire</div>
                        <p className="text-sm text-steel/90">{m.center.winCondition}</p>

                        {m.center.warning && (
                          <div className="mt-3 pt-3 border-t border-line text-sm text-red-400">⚠️ {m.center.warning}</div>
                        )}
                      </div>
                    )}

                    {m.guide && (
                      <div className={m.center ? "pt-3 border-t border-line" : ""}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[11px] font-mono uppercase tracking-wider text-steel/50">Vu dans les tier lists / stats publiques</span>
                          <span className={`badge ${GUIDE_BADGE[m.guide.difficulty]} text-[9px]`}>{m.guide.difficulty}</span>
                        </div>
                        {m.conflicting && (
                          <p className="text-xs text-gold mb-2">
                            ⚠ Cette source ne dit pas la même chose que ton plan de jeu perso ci-dessus — vérifie avec ton propre feeling en partie, ou avec le bouton "Rafraîchir depuis mes parties" ci-dessus une fois que tu as assez de données.
                          </p>
                        )}
                        <p className="text-xs text-steel/70 mb-2">{m.guide.why}</p>
                        <div className="text-[11px] font-mono uppercase text-gold mb-1">Comment contrer</div>
                        <ul className="space-y-0.5">
                          {m.guide.howToCounter.map((c, j) => <li key={j} className="text-xs text-steel/80">→ {c}</li>)}
                        </ul>
                        {m.guide.currentMeta && (
                          <div className="text-[10px] font-mono text-steel/40 mt-2">📊 {m.guide.currentMeta}</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* AUTRES ADVERSAIRES — connus uniquement via les sources publiques
          (pas encore de plan de jeu perso écrit pour eux). */}
      {guideOnly.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-ivory mb-3">Autres adversaires (sources publiques)</h2>
          <div className="space-y-2">
            {guideOnly.map((m) => {
              const open = expanded.has(`guide:${m.opponent}`);
              const real = findJournalMatch(m.opponent);
              return (
                <div key={m.opponent} className="card-tile overflow-hidden">
                  <button onClick={() => toggle(`guide:${m.opponent}`)} className="w-full p-4 flex items-center justify-between gap-3 text-left">
                    <div className="flex items-center gap-3 flex-wrap min-w-0">
                      <OpponentLeaderBadge label={m.opponent} size={26} />
                      <span className={`badge ${GUIDE_BADGE[m.difficulty]} text-[10px]`}>{m.difficulty}</span>
                      {real && (
                        <span className="text-[11px] font-mono text-emerald-bright bg-ink/40 rounded px-2 py-0.5">
                          Ta donnée : {real.wins}V-{real.losses}D ({Math.round((real.wins / real.total) * 100)}%)
                        </span>
                      )}
                    </div>
                    <span className="text-steel/50 text-xs shrink-0">{open ? "▲" : "▼"}</span>
                  </button>
                  {open && (
                    <div className="px-4 pb-4 pt-1 border-t border-line">
                      <p className="text-xs text-steel/70 mb-2">{m.why}</p>
                      <div className="text-[11px] font-mono uppercase text-gold mb-1">Comment contrer</div>
                      <ul className="space-y-0.5">
                        {m.howToCounter.map((c, j) => <li key={j} className="text-xs text-steel/80">→ {c}</li>)}
                      </ul>
                      {m.currentMeta && (
                        <div className="text-[10px] font-mono text-steel/40 mt-2">📊 {m.currentMeta}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="card-tile p-5">
        <h3 className="font-semibold text-ivory mb-3 border-b border-line pb-2">Ressources OPTCG pour approfondir</h3>
        <div className="space-y-2">
          {OPTCG_RESOURCES.map((r) => (
            <div key={r.name} className="text-xs font-mono">
              <span className="text-white">{r.name}</span>
              <span className="text-steel/70"> — {r.use}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
