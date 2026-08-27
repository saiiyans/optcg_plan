import { computeLibraryStats, computeMyDeckStats } from "@/lib/libraryStats";
import { db } from "@/lib/db";
import { LEADERS } from "@/lib/leaders";
import { LeaderImage } from "@/components/LeaderImage";
import { CoachBilanSection, MatchesOverview, PersonalStatsSection } from "@/components/PerformanceStats";

export default async function Dashboard() {
  const [libStats, deckStats, lastLog] = await Promise.all([
    computeLibraryStats(),
    computeMyDeckStats(),
    db.importLog.findFirst({ orderBy: { startedAt: "desc" } }),
  ]);

  const leaderStats = await Promise.all(
    LEADERS.map(async (leader) => {
      const ratings = await db.personalRating.findMany({ where: { leaderContext: leader.leaderContext } });
      const winningDecks = await db.tournamentDeck.count({ where: { deckProfile: leader.deckProfile, status: "winner" } });
      const allDecks = await db.tournamentDeck.count({ where: { deckProfile: leader.deckProfile } });
      return {
        leader,
        fiveStar: ratings.filter((r) => r.stars >= 5).length,
        fourStar: ratings.filter((r) => r.stars >= 4 && r.stars < 5).length,
        winningDecks,
        allDecks,
      };
    })
  );

  return (
    <div className="space-y-6">
      {/* EN-TÊTE (refonte — style Nakama Companion, cohérent avec
          Cartes/Matchups/Tier List) */}
      <div className="pt-1 pb-1">
        <span className="eyebrow-flame">✦ One Piece TCG · Statistiques</span>
        <h1 className="mt-1.5 text-3xl sm:text-4xl font-extrabold tracking-tight text-ivory leading-[1.05]">
          Ton <span className="text-flame-gradient italic">bilan de coach.</span>
        </h1>
      </div>

      {/* PERFORMANCE — en tête : c'est ce qu'on veut voir en premier en
          arrivant sur "Stats" (winrate, forme récente, matchups, erreurs
          fréquentes). La santé de la bibliothèque de cartes (import,
          couverture) reste utile mais secondaire, plus bas. */}
      <CoachBilanSection />
      <MatchesOverview />
      <PersonalStatsSection />

      <div className="pt-2 border-t border-line">
        <h2 className="font-mono text-xs uppercase tracking-widest text-steel/50 mb-3">Bibliothèque de cartes</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Tile label="Cartes vertes importées (références uniques)" value={libStats.totalGreenCards} />
          <Tile label="Références sans image" value={libStats.cardsWithoutImage} />
          <Tile
            label="Références de ma decklist Mihawk reconnues"
            value={`${deckStats.recognizedReferences} / ${deckStats.uniqueReferences}`}
          />
          <Tile label="Total exemplaires dans mon deck Mihawk" value={`${deckStats.totalExemplaires} / 50`} />
          <Tile
            label="Dernière synchronisation"
            value={lastLog ? new Date(lastLog.startedAt).toLocaleString("fr-FR") : "Jamais"}
            wide
          />
          <Tile label="Erreurs du dernier import" value={lastLog ? countImportErrors(lastLog.errors) : 0} wide />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {leaderStats.map(({ leader, fiveStar, fourStar, winningDecks, allDecks }) => (
          <div key={leader.key} className="card-tile p-5">
            <span className={`badge ${leader.badgeClass} mb-3 inline-flex items-center gap-1.5`}>
              <LeaderImage leaderKey={leader.key} size={16} />
              {leader.label}
            </span>
            <div className="grid grid-cols-2 gap-3">
              <MiniTile label="5 étoiles" value={fiveStar} accent />
              <MiniTile label="4 étoiles" value={fourStar} accent />
              <MiniTile label="Decks winner importés" value={winningDecks} />
              <MiniTile label="Total decks (tous statuts)" value={allDecks} />
            </div>
            {leader.releaseNote && allDecks === 0 && (
              <div className="text-[11px] font-mono text-steel/60 mt-3">{leader.releaseNote}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** JSON.parse protégé — un blob `errors` malformé ne doit jamais faire
 * planter tout le rendu du dashboard, juste afficher "0". */
function countImportErrors(errors: string | null): number {
  try {
    const parsed = JSON.parse(errors || "[]");
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

function Tile({ label, value, accent, wide }: { label: string; value: string | number; accent?: boolean; wide?: boolean }) {
  return (
    <div className={`card-tile p-4 ${wide ? "col-span-2" : ""}`}>
      <div className={`text-3xl font-mono font-bold ${accent ? "text-gold" : "text-emerald-bright"}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-steel/60 mt-1">{label}</div>
    </div>
  );
}

function MiniTile({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="bg-panel2 rounded-lg p-3">
      <div className={`text-xl font-mono ${accent ? "text-gold" : "text-emerald-bright"}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-steel/60 mt-1">{label}</div>
    </div>
  );
}
