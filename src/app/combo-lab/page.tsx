import Link from "next/link";
import { COMBOS } from "@/lib/comboLab";

export default function ComboLabPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] font-mono uppercase tracking-widest text-gold">🧪 Combo Lab</div>
        <h1 className="text-xl font-display text-white">Séquences clés du deck Mihawk</h1>
        <p className="text-xs text-steel/60 mt-1">Explications originales des enchaînements les plus utiles — pas le texte officiel des cartes.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {COMBOS.map((combo) => (
          <div key={combo.slug} className="card-tile p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-mono text-white font-semibold">{combo.title}</h2>
              {combo.rating && (
                <span className="text-gold text-sm">{"★".repeat(combo.rating)}{"☆".repeat(5 - combo.rating)}</span>
              )}
            </div>
            <div className="flex flex-col gap-1 mb-3">
              {combo.steps.map((step, i) => (
                <div key={i} className="text-xs font-mono text-steel/80 flex items-start gap-1.5">
                  {i > 0 && <span className="text-emerald-bright">↓</span>}
                  <span>{step}</span>
                </div>
              ))}
            </div>
            {combo.badge && <div className="inline-block badge badge-gold mb-2">{combo.badge}</div>}
            {combo.note && <p className="text-xs text-steel/70 mb-3">{combo.note}</p>}
            <div className="flex flex-wrap gap-1.5">
              {combo.cards.map((c) => (
                <Link key={c} href={`/cards/${c}`} className="badge badge-green">{c}</Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
