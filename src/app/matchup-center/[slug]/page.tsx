import { notFound } from "next/navigation";
import { MATCHUP_CENTER, DIFFICULTY_LABEL } from "@/lib/matchupCenter";
import { BackButton } from "@/components/BackButton";
import { CardThumb } from "@/components/CardThumb";
import { OpponentLeaderBadge } from "@/components/OpponentLeaderBadge";

export default function MatchupDetailPage({ params }: { params: { slug: string } }) {
  const m = MATCHUP_CENTER.find((x) => x.slug === params.slug);
  if (!m) notFound();
  const diff = DIFFICULTY_LABEL[m.difficulty];

  return (
    <div className="space-y-5">
      <BackButton />

      <div className="card-tile p-5">
        <div className="text-[11px] font-mono uppercase tracking-widest text-gold">VS</div>
        <h1 className="text-[28px] sm:text-3xl font-display font-bold text-white mb-2"><OpponentLeaderBadge label={m.opponent} size={32} /></h1>
        <div className="flex items-center gap-4 flex-wrap">
          <span className={`text-sm font-mono ${diff.color}`}>{diff.icon} {diff.label}</span>
          <span className="text-sm text-gold">{"★".repeat(m.trainingPriority)}{"☆".repeat(5 - m.trainingPriority)} Training Priority</span>
        </div>
      </div>

      <div className="card-tile p-5">
        <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-bright mb-1">Primary Objective</div>
        <div className="text-lg font-mono text-white mb-4">{m.primaryObjective}</div>

        <div className="text-[11px] font-mono uppercase tracking-wider text-gold mb-1">Why {m.difficulty === "hard" || m.difficulty === "very-hard" ? "hard" : "this rating"}</div>
        <p className="text-sm text-steel/90 mb-4">{m.why}</p>

        <div className="text-[11px] font-mono uppercase tracking-wider text-gold mb-1">Plan</div>
        <p className="text-sm text-steel/90 mb-4">{m.plan}</p>

        {m.keyCards.length > 0 && (
          <>
            <div className="text-[11px] font-mono uppercase tracking-wider text-gold mb-1">Key Cards</div>
            <div className="flex flex-wrap gap-2 mb-4">
              {m.keyCards.map((c) => (
                <CardThumb key={c} cardNumber={c} size={56} />
              ))}
            </div>
          </>
        )}

        {m.dontDo.length > 0 && (
          <>
            <div className="text-[11px] font-mono uppercase tracking-wider text-red-400 mb-1">Don't Do</div>
            <ul className="mb-4 space-y-0.5">
              {m.dontDo.map((d) => <li key={d} className="text-sm text-steel/80">❌ {d}</li>)}
            </ul>
          </>
        )}

        <div className="text-[11px] font-mono uppercase tracking-wider text-gold mb-1">Win Condition</div>
        <p className="text-sm text-steel/90">{m.winCondition}</p>

        {m.warning && (
          <div className="mt-4 pt-4 border-t border-line text-sm text-red-400">⚠️ {m.warning}</div>
        )}
      </div>
    </div>
  );
}
