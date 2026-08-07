import { MIHAWK_REFERENCE_DECK } from "@/lib/deckReference";
import {
  MIHAWK_DECK_NAME,
  MIHAWK_DECK_STYLE,
  MIHAWK_PROFILE_SCORES,
  HOW_THIS_DECK_WINS,
  WIN_FLOW,
  STRENGTHS,
  WEAKNESSES,
  BUILD_ANALYSIS,
  COACH_RECOMMENDATIONS,
  HAWKEYE_RULES,
} from "@/lib/deckProfile";
import { LeaderImage } from "@/components/LeaderImage";
import Link from "next/link";

export default function DeckProfilePage() {
  const totalCards = MIHAWK_REFERENCE_DECK.cards.reduce((s, c) => s + c.quantity, 0);

  return (
    <div className="space-y-6">
      {/* MY MIHAWK */}
      <div className="card-tile p-5">
        <div className="flex items-center gap-3 mb-1">
          <LeaderImage leaderKey="mihawk" size={40} />
          <div>
            <div className="text-[11px] font-mono uppercase tracking-widest text-gold">My Mihawk</div>
            <h1 className="text-xl font-display text-white">{MIHAWK_DECK_NAME}</h1>
          </div>
        </div>
        <div className="text-xs font-mono text-steel/60 mb-3">{totalCards} cartes hors Leader · Style : {MIHAWK_DECK_STYLE}</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {MIHAWK_REFERENCE_DECK.cards.map((c) => (
            <Link key={c.cardNumber} href={`/cards/${c.cardNumber}`} className="bg-panel2 rounded-lg px-2.5 py-1.5 text-xs font-mono hover:border hover:border-emerald flex items-center justify-between">
              <span className="text-steel/80 truncate">{c.cardNumber}</span>
              <span className="text-emerald-bright shrink-0 ml-1">×{c.quantity}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* DECK PROFILE */}
      <div className="card-tile p-5">
        <h2 className="font-mono text-xs uppercase tracking-widest text-gold mb-3 border-b border-line pb-2">🦅 Mihawk Deck Profile</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          {MIHAWK_PROFILE_SCORES.map((s) => (
            <div key={s.label} className="bg-panel2 rounded-lg p-3">
              <div className="text-lg font-mono text-emerald-bright">{s.score}/10</div>
              <div className="text-[10px] uppercase tracking-wider text-steel/60 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="text-[11px] font-mono uppercase tracking-wider text-gold mb-1">How this deck wins</div>
        <p className="text-sm text-white mb-3">{HOW_THIS_DECK_WINS}</p>
        <div className="flex items-center gap-1.5 flex-wrap text-xs font-mono">
          {WIN_FLOW.map((step, i) => (
            <span key={step} className="flex items-center gap-1.5">
              <span className="bg-emerald-dim text-emerald-bright px-2 py-1 rounded">{step}</span>
              {i < WIN_FLOW.length - 1 && <span className="text-steel/40">→</span>}
            </span>
          ))}
        </div>
      </div>

      {/* STRENGTHS / WEAKNESSES */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card-tile p-5">
          <h2 className="font-mono text-xs uppercase tracking-widest text-emerald-bright mb-3 border-b border-line pb-2">💪 Strengths</h2>
          <div className="space-y-3">
            {STRENGTHS.map((s) => (
              <div key={s.title}>
                <div className="text-xs font-mono font-semibold text-white">{s.title}</div>
                <div className="text-xs text-steel/70">{s.description}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card-tile p-5">
          <h2 className="font-mono text-xs uppercase tracking-widest text-red-400 mb-3 border-b border-line pb-2">⚠️ Weaknesses</h2>
          <div className="space-y-3">
            {WEAKNESSES.map((w) => (
              <div key={w.title}>
                <div className="text-xs font-mono font-semibold text-white">{w.title}</div>
                <div className="text-xs text-steel/70">{w.description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* COACH DECK ANALYSIS */}
      <div className="card-tile p-5">
        <h2 className="font-mono text-xs uppercase tracking-widest text-gold mb-3 border-b border-line pb-2">Coach Deck Analysis</h2>
        <p className="text-sm text-white">{BUILD_ANALYSIS}</p>
      </div>

      {/* COACH RECOMMENDATIONS */}
      <div className="card-tile p-5">
        <h2 className="font-mono text-xs uppercase tracking-widest text-gold mb-3 border-b border-line pb-2">🔧 Possible Optimizations</h2>
        <p className="text-xs text-steel/60 mb-4">{COACH_RECOMMENDATIONS.intro}</p>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="text-[11px] font-mono uppercase text-red-400 mb-2">Remove</div>
            <div className="space-y-2">
              {COACH_RECOMMENDATIONS.cuts.map((c) => (
                <div key={c.change} className="bg-panel2 rounded-lg p-2.5">
                  <div className="text-xs font-mono text-white">{c.change}</div>
                  <ul className="mt-1">
                    {c.reasons.map((r) => <li key={r} className="text-[11px] text-steel/70">✓ {r}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase text-emerald-bright mb-2">Add</div>
            <div className="space-y-2">
              {COACH_RECOMMENDATIONS.adds.map((c) => (
                <div key={c.change} className="bg-panel2 rounded-lg p-2.5">
                  <div className="text-xs font-mono text-white">{c.change}</div>
                  <ul className="mt-1">
                    {c.reasons.map((r) => <li key={r} className="text-[11px] text-steel/70">✓ {r}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* HAWKEYE RULES */}
      <div className="card-tile p-5">
        <h2 className="font-mono text-xs uppercase tracking-widest text-gold mb-3 border-b border-line pb-2">🦅 Hawkeye Rules</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {HAWKEYE_RULES.map((r) => (
            <div key={r.n} className="bg-panel2 rounded-lg p-3">
              <div className="text-[10px] font-mono text-gold">{String(r.n).padStart(2, "0")}</div>
              <div className="text-sm font-mono text-white">{r.title}</div>
              <div className="text-xs text-steel/70 mt-1">{r.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
