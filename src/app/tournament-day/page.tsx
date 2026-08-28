"use client";
import { useEffect, useMemo, useState } from "react";
import { useOpponentLeaders } from "@/lib/useOpponentLeaders";
import { MY_DECKS } from "@/lib/planningData";
import { MATCHUP_GUIDES, META_LEADER_SNAPSHOT } from "@/lib/matchupGuide";
import { getMergedMatchups } from "@/lib/matchupMerge";
import { DIFFICULTY_LABEL } from "@/lib/matchupCenter";
import { QUICK_MISTAKES } from "@/lib/coachDiagnostic";
import { OpponentLeaderBadge } from "@/components/OpponentLeaderBadge";
import { LeaderImage } from "@/components/LeaderImage";
import { FicheExpressMihawk } from "@/components/FicheExpressMihawk";
import { notifyMatchLogged } from "@/lib/trainingCounterBus";

// --- /tournament-day — "Mode Jour de Tournoi". Pas une nouvelle source de
// données : logue via le même /api/matches que le Journal (mode "Boutique",
// trainingPhase "official_training"), donc tout ce qui est saisi ici nourrit
// exactement les mêmes statistiques/objectifs/coach que d'habitude, sans
// dataset parallèle. La seule nouveauté est l'ENCHAÎNEMENT pensé pour la
// table : entrer le leader adverse de la manche → voir tout de suite le plan
// de jeu qui le concerne → loguer le résultat en 2 taps → manche suivante.
// Le numéro de manche n'est jamais stocké : il est recalculé à chaque
// chargement à partir du nombre de parties "Boutique" déjà loguées
// aujourd'hui, pour rester exact même après un refresh de page en cours de
// tournoi (pas de deuxième source de vérité à désynchroniser).

const GUIDE_BADGE: Record<string, string> = {
  Favorable: "badge-green",
  Défavorable: "badge-red",
  Serré: "badge-gold",
  "À tester": "badge-gray",
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function findMatchupTip(opponentInput: string) {
  const { merged, guideOnly } = getMergedMatchups();
  const shortInput = opponentInput.split(" (")[0].toLowerCase().trim();
  if (!shortInput) return null;

  for (const m of merged) {
    const shortCenter = m.opponentLabel.split(" (")[0].toLowerCase();
    const shortGuide = m.guide?.opponent.split(" (")[0].toLowerCase();
    if (shortCenter.includes(shortInput) || shortInput.includes(shortCenter) || (shortGuide && (shortGuide.includes(shortInput) || shortInput.includes(shortGuide)))) {
      return { kind: "merged" as const, entry: m };
    }
  }
  for (const g of guideOnly) {
    const shortGuide = g.opponent.split(" (")[0].toLowerCase();
    if (shortGuide.includes(shortInput) || shortInput.includes(shortGuide)) {
      return { kind: "guide" as const, entry: g };
    }
  }
  return null;
}

function findMetaSnapshot(opponentInput: string) {
  const shortInput = opponentInput.split(" (")[0].toLowerCase().trim();
  if (!shortInput) return null;
  return (
    META_LEADER_SNAPSHOT.find((l) => {
      const shortName = l.name.toLowerCase();
      return shortName.includes(shortInput) || shortInput.includes(shortName);
    }) ?? null
  );
}

export default function TournamentDayPage() {
  const opponentLeaders = useOpponentLeaders();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [opponent, setOpponent] = useState("");
  const [selectedMistakes, setSelectedMistakes] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [justLogged, setJustLogged] = useState<"Victoire" | "Défaite" | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/matches");
      const data = await res.json();
      setMatches(data.matches ?? []);
    } catch {
      // silencieux — l'écran reste utilisable en saisie même si le
      // chargement de l'historique du jour échoue temporairement
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const todaysRounds = useMemo(
    () => matches.filter((m) => m.date === todayISO() && m.mode === "Boutique").sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1)),
    [matches]
  );
  const roundNumber = todaysRounds.length + 1;
  const wins = todaysRounds.filter((m) => m.result === "Victoire").length;
  const losses = todaysRounds.filter((m) => m.result === "Défaite").length;

  const guide = MATCHUP_GUIDES.find((g) => g.leaderKey === "mihawk");
  const tip = findMatchupTip(opponent);
  const metaLine = findMetaSnapshot(opponent);

  function toggleMistake(m: string) {
    setSelectedMistakes((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });
  }

  async function logRound(result: "Victoire" | "Défaite") {
    if (!opponent.trim()) {
      alert("Renseigne le leader adverse de cette manche avant de loguer le résultat.");
      return;
    }
    setSaving(true);
    const mistakes = Array.from(selectedMistakes);
    const payload = {
      date: todayISO(),
      mode: "Boutique",
      myDeck: MY_DECKS[0],
      opponentLeader: opponent.trim(),
      result,
      trainingPhase: "official_training",
      mainMistake: mistakes[0] ?? null,
      mistakesJson: mistakes.length ? JSON.stringify(mistakes) : null,
      notes: note.trim() || null,
    };
    try {
      const res = await fetch("/api/matches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const created = await res.json().catch(() => null);
      if (created?.ok && created.match?.result === "Défaite") {
        fetch(`/api/matches/${created.match.id}/analyze`, { method: "POST" }).catch(() => {});
      }
      notifyMatchLogged();
      setJustLogged(result);
      setOpponent("");
      setSelectedMistakes(new Set());
      setNote("");
      await load();
      setTimeout(() => setJustLogged(null), 3000);
    } catch {
      alert("Échec de l'enregistrement — vérifie ta connexion et réessaie, rien n'a été perdu dans le formulaire.");
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div className="pt-1 pb-1">
        <span className="eyebrow-flame">✦ One Piece TCG · Jour J</span>
        <h1 className="mt-1.5 text-3xl sm:text-4xl md:text-[2.75rem] font-extrabold tracking-tight text-ivory leading-[1.05]">
          Manche <span className="text-flame-gradient italic">{roundNumber}</span>.
        </h1>
        <p className="text-sm text-steel/70 mt-2 max-w-xl">
          Entre le leader adverse de cette manche pour voir tout de suite le plan de jeu qui le concerne, puis logue le résultat en 2 taps — tout part directement dans ton Journal.
        </p>
        {todaysRounds.length > 0 && (
          <div className="mt-3 inline-flex items-center gap-2 text-xs font-mono bg-panel2 rounded-lg px-3 py-1.5">
            <span className="text-white">Aujourd'hui : {wins}V-{losses}D</span>
            <span className="text-steel/50">sur {todaysRounds.length} manche{todaysRounds.length > 1 ? "s" : ""} loguée{todaysRounds.length > 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      {/* SAISIE DE LA MANCHE */}
      <div className="card-tile p-5 border-flame/40">
        <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1.5">Leader adverse de cette manche</label>
        <div className="flex items-center gap-2">
          <input
            list="td-leaders"
            className="input w-full"
            placeholder="ex. Sabo, Kaido, Enel..."
            value={opponent}
            onChange={(e) => setOpponent(e.target.value)}
            autoFocus
          />
          {opponent && <OpponentLeaderBadge label={opponent} size={32} />}
        </div>
        <datalist id="td-leaders">{opponentLeaders.map((l) => <option key={l} value={l} />)}</datalist>

        {justLogged && (
          <div className={`mt-3 text-sm font-mono rounded-lg px-3 py-2 ${justLogged === "Victoire" ? "bg-emerald-950/40 text-emerald-300" : "bg-red-950/40 text-red-300"}`}>
            {justLogged === "Victoire" ? "✓ Victoire loguée" : "✓ Défaite loguée"} — manche suivante quand tu es prêt.
          </div>
        )}

        <div className="mt-4">
          <div className="text-[10px] font-mono uppercase text-steel/50 mb-1.5">Erreur(s) à noter (facultatif, sélection multiple)</div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_MISTAKES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => toggleMistake(m)}
                className={`text-[10px] font-mono px-2 py-1 rounded-full border transition-colors duration-150 ${
                  selectedMistakes.has(m) ? "bg-flame/20 border-flame text-white" : "border-line text-steel/60 hover:text-white"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <input
            className="input w-full text-xs"
            placeholder="Note rapide (facultatif) — un détail à ne pas oublier après la manche"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={() => logRound("Victoire")}
            disabled={saving}
            className="flex-1 btn btn-primary py-3.5 text-base"
          >
            🏆 Victoire
          </button>
          <button
            onClick={() => logRound("Défaite")}
            disabled={saving}
            className="flex-1 py-3.5 text-base rounded-xl font-semibold border border-red-800/50 bg-red-950/30 text-red-300 hover:bg-red-950/50 transition-colors duration-150"
          >
            💀 Défaite
          </button>
        </div>
      </div>

      {/* PLAN DE JEU DE LA MANCHE */}
      {opponent.trim() && (
        <div className="card-tile p-5">
          <div className="text-[11px] font-mono uppercase tracking-widest text-gold mb-3">Plan de jeu contre cet adversaire</div>
          {metaLine && (
            <div className="text-[11px] font-mono text-steel/60 mb-3">
              📊 Rang {metaLine.rank}/117 · {metaLine.playRate.toFixed(2)}% des parties · winrate pondéré {metaLine.wtdWinRate.toFixed(2)}% (cardkaizoku.com, 27/08/2026)
            </div>
          )}
          {!tip && (
            <p className="text-sm text-steel/70">
              Pas de fiche spécifique trouvée pour "{opponent}" — applique le plan de jeu général de Mihawk ci-dessous (Fiche express) et logue quand même la manche : ça sert à construire ta propre donnée pour la prochaine fois.
            </p>
          )}
          {tip?.kind === "merged" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <OpponentLeaderBadge label={tip.entry.opponentLabel} size={24} />
                {tip.entry.center && (
                  <span className={`text-xs font-mono ${DIFFICULTY_LABEL[tip.entry.center.difficulty].color}`}>
                    {DIFFICULTY_LABEL[tip.entry.center.difficulty].icon} {DIFFICULTY_LABEL[tip.entry.center.difficulty].label}
                  </span>
                )}
              </div>
              {tip.entry.center && (
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-gold mb-1">Objectif principal</div>
                  <div className="text-sm font-mono text-white mb-2">{tip.entry.center.primaryObjective}</div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-gold mb-1">Plan</div>
                  <p className="text-sm text-steel/90 mb-2">{tip.entry.center.plan}</p>
                  {tip.entry.center.dontDo.length > 0 && (
                    <>
                      <div className="text-[11px] font-mono uppercase tracking-wider text-red-400 mb-1">À ne pas faire</div>
                      <ul className="space-y-0.5">
                        {tip.entry.center.dontDo.map((d) => <li key={d} className="text-sm text-steel/80">❌ {d}</li>)}
                      </ul>
                    </>
                  )}
                  {tip.entry.center.warning && <div className="mt-2 text-sm text-red-400">⚠️ {tip.entry.center.warning}</div>}
                </div>
              )}
              {tip.entry.guide && (
                <div className={tip.entry.center ? "pt-3 border-t border-line" : ""}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-steel/50">Sources publiques</span>
                    <span className={`badge ${GUIDE_BADGE[tip.entry.guide.difficulty]} text-[9px]`}>{tip.entry.guide.difficulty}</span>
                  </div>
                  <p className="text-xs text-steel/70 mb-2">{tip.entry.guide.why}</p>
                  <div className="text-[11px] font-mono uppercase text-gold mb-1">Comment contrer</div>
                  <ul className="space-y-0.5">
                    {tip.entry.guide.howToCounter.map((c, j) => <li key={j} className="text-xs text-steel/80">→ {c}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
          {tip?.kind === "guide" && (
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <OpponentLeaderBadge label={tip.entry.opponent} size={24} />
                <span className={`badge ${GUIDE_BADGE[tip.entry.difficulty]} text-[10px]`}>{tip.entry.difficulty}</span>
              </div>
              <p className="text-xs text-steel/70 mb-2">{tip.entry.why}</p>
              <div className="text-[11px] font-mono uppercase text-gold mb-1">Comment contrer</div>
              <ul className="space-y-0.5">
                {tip.entry.howToCounter.map((c, j) => <li key={j} className="text-xs text-steel/80">→ {c}</li>)}
              </ul>
            </div>
          )}
          <a href="/matchups" className="text-[11px] font-mono text-emerald-bright hover:underline mt-3 inline-block">Voir la fiche complète →</a>
        </div>
      )}

      <FicheExpressMihawk />

      {guide && (
        <div className="card-tile p-5">
          <span className="badge badge-green mb-3 inline-flex items-center gap-1.5">
            <LeaderImage leaderKey="mihawk" size={16} />
            Mihawk OP14-020 — plan général
          </span>
          <p className="text-sm text-white">{guide.gameplanSummary}</p>
        </div>
      )}

      {/* HISTORIQUE DU JOUR */}
      {!loading && todaysRounds.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-ivory mb-3">Manches d'aujourd'hui</h2>
          <div className="space-y-1.5">
            {todaysRounds.map((m, i) => (
              <div key={m.id} className="card-tile p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-[10px] font-mono text-steel/40 w-5 shrink-0">R{i + 1}</span>
                  <OpponentLeaderBadge label={m.opponentLeader} size={22} />
                  <span className="text-xs text-white truncate">{m.opponentLeader}</span>
                </div>
                <span className={`badge shrink-0 ${m.result === "Victoire" ? "badge-green" : "badge-red"}`}>{m.result === "Victoire" ? "V" : "D"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
