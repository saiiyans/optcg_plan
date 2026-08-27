import Link from "next/link";
import { MATCHUP_CENTER, DIFFICULTY_LABEL } from "@/lib/matchupCenter";
import { OpponentLeaderBadge } from "@/components/OpponentLeaderBadge";

export default function MatchupCenterPage() {
  return (
    <div className="space-y-6">
      <div className="pt-1 pb-1">
        <span className="eyebrow-flame">✦ One Piece TCG · Meta Tool</span>
        <h1 className="mt-1.5 text-3xl sm:text-4xl font-extrabold tracking-tight text-ivory leading-[1.05]">
          Plans de jeu par <span className="text-flame-gradient italic">leader adverse.</span>
        </h1>
        <p className="text-sm text-steel/70 mt-2 max-w-xl">Analyses stratégiques originales — pas de statistiques inventées, à affiner avec ton propre Journal.</p>
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
