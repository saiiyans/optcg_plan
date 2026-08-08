import Link from "next/link";
import { MATCHUP_CENTER, DIFFICULTY_LABEL } from "@/lib/matchupCenter";
import { OpponentLeaderBadge } from "@/components/OpponentLeaderBadge";

export default function MatchupCenterPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] font-mono uppercase tracking-widest text-gold">⚔️ Matchup Center</div>
        <h1 className="text-[28px] sm:text-3xl font-display font-bold text-white">Plans de jeu par leader adverse</h1>
        <p className="text-xs text-steel/60 mt-1">Analyses stratégiques originales — pas de statistiques inventées, à affiner avec ton propre Journal.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {MATCHUP_CENTER.map((m) => {
          const diff = DIFFICULTY_LABEL[m.difficulty];
          return (
            <Link key={m.slug} href={`/matchup-center/${m.slug}`} className="card-tile p-4 block hover:border-emerald transition-colors">
              <div className="text-sm text-white font-mono mb-2"><OpponentLeaderBadge label={m.opponent} size={22} /></div>
              <div className={`text-xs font-mono ${diff.color} mb-1`}>{diff.icon} {diff.label}</div>
              <div className="text-[10px] text-gold">{"★".repeat(m.trainingPriority)}{"☆".repeat(5 - m.trainingPriority)} training priority</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
