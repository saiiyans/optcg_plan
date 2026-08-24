"use client";
import { useState } from "react";
import { MATCHUP_GUIDES, OPTCG_RESOURCES } from "@/lib/matchupGuide";
import { LeaderImage } from "@/components/LeaderImage";
import { OpponentLeaderBadge } from "@/components/OpponentLeaderBadge";

// --- /matchups (section 5/6) — sorti de l'ancien onglet "Matchups" de
// Prépa pour devenir sa propre page, comme demandé : le Journal reste
// unique/vertical, mais les fiches matchups gardent leur propre page.
export default function MatchupsPage() {
  const [journalStats, setJournalStats] = useState<Record<string, { wins: number; losses: number; total: number }> | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [syncResult, setSyncResult] = useState<{ inserted: number; skipped: number; error?: string } | null>(null);

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

  // Cherche une correspondance approximative entre le nom d'un adversaire du
  // guide statique ("Enel (OP15-058)") et une clé du journal, qui peut être
  // saisie légèrement différemment ("Enel", "Enel OP15-058"...).
  function findJournalMatch(opponentLabel: string) {
    if (!journalStats) return null;
    const shortName = opponentLabel.split(" (")[0].toLowerCase().trim();
    const key = Object.keys(journalStats).find(
      (k) => k.toLowerCase().includes(shortName) || shortName.includes(k.toLowerCase())
    );
    return key ? journalStats[key] : null;
  }

  return (
    <div className="space-y-6">
      <div className="card-tile rounded-sm p-4">
        <div className="text-[11px] font-mono uppercase tracking-widest text-gold">Matchups</div>
        <div className="text-white text-sm mt-1">Fiches par archétype adverse — quoi faire face à chacun, avant de s'asseoir à la table.</div>
      </div>

      <div className="card-tile p-5">
        <p className="text-sm text-steel/80 mb-3">
          Le but n'est pas de mémoriser des pourcentages, mais de savoir <span className="text-white">quoi faire</span> face
          à chaque archétype avant même de s'asseoir à la table. Les pistes ci-dessous viennent de tier lists publiques et de
          statistiques de tournoi sourcées — teste-les toi-même, ajuste selon ton feeling en partie.
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

      {MATCHUP_GUIDES.map((guide) => (
        <div key={guide.leaderKey} className="card-tile p-5">
          <span className={`badge ${guide.leaderKey === "mihawk" ? "badge-green" : "badge-gold"} mb-3 inline-flex items-center gap-1.5`}>
            <LeaderImage leaderKey={guide.leaderKey} size={16} />
            {guide.leaderKey === "mihawk" ? "Mihawk OP14-020" : "Shanks OP17"}
          </span>
          <p className="text-sm text-white mb-3">{guide.gameplanSummary}</p>

          {guide.keyStats && (
            <div className="bg-panel2 rounded-lg p-3 mb-4 text-xs text-steel/80">
              <span className="text-gold font-mono uppercase text-[10px] tracking-wider">Chiffre sourcé</span>
              <p className="mt-1">{guide.keyStats}</p>
            </div>
          )}

          <div className="mb-4">
            <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-bright mb-1.5">Points forts</div>
            <ul className="space-y-1">
              {guide.strengths.map((s, i) => (
                <li key={i} className="text-xs font-mono text-steel/80">• {s}</li>
              ))}
            </ul>
          </div>

          {guide.worstMatchups.length > 0 ? (
            <div className="space-y-3">
              <div className="text-[11px] font-mono uppercase tracking-wider text-red-400">Matchups connus</div>
              {guide.worstMatchups.map((m, i) => {
                const real = findJournalMatch(m.opponent);
                const badgeClass =
                  m.difficulty === "Favorable" ? "badge-green" : m.difficulty === "Défavorable" ? "badge-red" : "badge-gold";
                return (
                  <div key={i} className="bg-panel2 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                      <span className="text-white text-sm"><OpponentLeaderBadge label={m.opponent} size={22} /></span>
                      <span className={`badge ${badgeClass}`}>{m.difficulty}</span>
                    </div>
                    <p className="text-xs text-steel/70 mb-2">{m.why}</p>
                    {real && (
                      <div className="text-xs font-mono text-emerald-bright mb-2 bg-ink/40 rounded px-2 py-1 inline-block">
                        Ta donnée : {real.wins}V-{real.losses}D sur {real.total} partie{real.total > 1 ? "s" : ""} ({Math.round((real.wins / real.total) * 100)}%)
                      </div>
                    )}
                    <div className="text-[11px] font-mono uppercase text-gold mb-1">Comment contrer</div>
                    <ul className="space-y-0.5">
                      {m.howToCounter.map((c, j) => (
                        <li key={j} className="text-xs text-steel/80">→ {c}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs font-mono text-steel/60 bg-panel2 rounded-lg p-3">Pas encore de matchups répertoriés.</div>
          )}

          <div className="text-[10px] font-mono text-steel/50 mt-3 pt-3 border-t border-line">{guide.sourceNote}</div>
        </div>
      ))}

      <div className="card-tile p-5">
        <h3 className="font-mono text-xs uppercase tracking-widest text-gold mb-3 border-b border-line pb-2">
          Ressources OPTCG pour approfondir
        </h3>
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
