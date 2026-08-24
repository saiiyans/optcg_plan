"use client";
import { MIHAWK_MULLIGAN, MIHAWK_TURN_GUIDE, MIHAWK_PRINCIPLES, MIHAWK_CORE_CARDS, MIHAWK_MATCHUP_NOTES } from "@/lib/mihawkGamePlan";
import { MATCHUP_GUIDES } from "@/lib/matchupGuide";
import { CardThumb } from "@/components/CardThumb";

// --- /revisions (section 5/6) — sorti de l'ancien onglet "Révisions" de
// Prépa pour devenir sa propre page (fiches à relire avant une session).

function RevisionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-tile rounded-sm p-5">
      <h3 className="font-mono text-xs uppercase tracking-widest text-gold mb-3 border-b border-line pb-2">{title}</h3>
      {children}
    </div>
  );
}

export default function RevisionsPage() {
  return (
    <div className="space-y-6">
      <div className="card-tile rounded-sm p-4">
        <div className="text-[11px] font-mono uppercase tracking-widest text-gold">Révisions</div>
        <div className="text-white text-sm mt-1">Fiches rapides à relire avant une session.</div>
      </div>

      <p className="text-xs text-steel/60">
        Contenu déjà écrit ailleurs dans l'app, juste rassemblé ici pour une révision express.
      </p>

      <RevisionCard title="Effet du Leader Mihawk">
        <p className="text-sm text-white leading-relaxed">
          Si le Leader adverse a l'attribut Slash, Mihawk gagne +1000 de puissance.
          [Activate: Main] [Once Per Turn] Tu peux reposer 1 de tes cartes : si tu as un personnage coût 5 ou plus, réactive jusqu'à 3 de tes DON!!. Tu ne peux alors plus jouer de personnage ce tour.
        </p>
        <p className="text-xs text-red-400 mt-2">⚠ Ne joue aucun personnage — il ne fait que réactiver du DON!!.</p>
      </RevisionCard>

      <RevisionCard title="Ordre correct des actions">
        <ol className="text-sm text-steel/90 space-y-1 list-decimal list-inside">
          <li>Joue tes personnages nécessaires d'abord</li>
          <li>Active l'effet Leader Mihawk ensuite (plus de personnage jouable après)</li>
          <li>Calcule le létal avant ta première attaque</li>
          <li>Attaque dans l'ordre qui force les pires Counters adverses</li>
        </ol>
      </RevisionCard>

      <div className="grid md:grid-cols-2 gap-4">
        <RevisionCard title="Mulligan">
          <div className="text-xs text-steel/80 mb-2"><span className="text-emerald-bright">Premier :</span> {MIHAWK_MULLIGAN.goingFirst}</div>
          <div className="text-xs text-steel/80"><span className="text-emerald-bright">Second :</span> {MIHAWK_MULLIGAN.goingSecond}</div>
        </RevisionCard>

        <RevisionCard title="Calcul du létal">
          <ul className="text-xs text-steel/80 space-y-1 list-disc list-inside">
            <li>Additionne la puissance de tous tes attaquants disponibles</li>
            <li>Compare aux vies adverses restantes, pas à la puissance du Leader seul</li>
            <li>Compte le Counter adverse probable AVANT de déclarer l'attaque</li>
            <li>Vérifie toujours le létal avant de jouer une carte qui pourrait le rater</li>
          </ul>
        </RevisionCard>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <RevisionCard title="Courbe — premier">
          <div className="space-y-1">
            {MIHAWK_TURN_GUIDE.goingFirst.map((t) => (
              <div key={t.turn} className="text-xs text-steel/70">
                <span className="text-white font-mono">T{t.turn} ({t.don} DON) :</span> {t.play}
              </div>
            ))}
          </div>
        </RevisionCard>
        <RevisionCard title="Courbe — second">
          <div className="space-y-1">
            {MIHAWK_TURN_GUIDE.goingSecond.map((t) => (
              <div key={t.turn} className="text-xs text-steel/70">
                <span className="text-white font-mono">T{t.turn} ({t.don} DON) :</span> {t.play}
              </div>
            ))}
          </div>
        </RevisionCard>
      </div>

      <RevisionCard title="Cartes prioritaires du deck">
        <div className="space-y-2">
          {MIHAWK_CORE_CARDS.map((c) => (
            <div key={c.cardNumber} className="bg-panel2 rounded-lg p-3 flex gap-3 items-start">
              <CardThumb cardNumber={c.cardNumber} size={44} showLabel={false} />
              <div className="min-w-0">
                <div className="text-xs font-mono text-white">{c.role}</div>
                <div className="text-xs text-steel/70 mt-0.5">{c.note}</div>
              </div>
            </div>
          ))}
        </div>
      </RevisionCard>

      <RevisionCard title="Synergies">
        <ul className="text-xs text-steel/80 space-y-1 list-disc list-inside">
          {MIHAWK_PRINCIPLES.map((p) => <li key={p}>{p}</li>)}
        </ul>
      </RevisionCard>

      <RevisionCard title="Menaces de chaque matchup">
        <div className="space-y-2">
          {MIHAWK_MATCHUP_NOTES.map((m) => (
            <div key={m.opponent} className="bg-panel2 rounded-lg p-3">
              <div className="text-xs font-mono text-white flex items-center gap-2">
                {m.opponent} <span className="badge badge-gold text-[9px]">{m.confidence}</span>
              </div>
              <div className="text-xs text-steel/70 mt-1">{m.note}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-line space-y-2">
          {MATCHUP_GUIDES.flatMap((g) => g.worstMatchups).slice(0, 4).map((m) => (
            <div key={m.opponent} className="text-xs">
              <span className="text-white font-mono">{m.opponent}</span> — <span className={m.difficulty === "Défavorable" ? "text-red-400" : m.difficulty === "Favorable" ? "text-emerald-bright" : "text-gold"}>{m.difficulty}</span>
              <div className="text-steel/60 mt-0.5">{m.why}</div>
            </div>
          ))}
        </div>
      </RevisionCard>
    </div>
  );
}
