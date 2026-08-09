"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { WEEKS, OPPONENT_LEADERS, MY_DECKS, TOURNAMENT_DATE } from "@/lib/planningData";
import { MATCHUP_GUIDES, OPTCG_RESOURCES } from "@/lib/matchupGuide";
import { LeaderImage } from "@/components/LeaderImage";
import { OpponentLeaderBadge } from "@/components/OpponentLeaderBadge";
import { QUICK_MISTAKES } from "@/lib/coachDiagnostic";

// Page d'historique de matchs personnelle sur Card D. Kaizoku (même
// deviceId/playerId utilisés par la synchronisation automatique et le
// bouton "Rafraîchir depuis mes parties" de l'onglet Matchups).
const KAIZOKU_HISTORY_URL =
  "https://www.cardkaizoku.com/matchhistory/search?deviceId=e29ac874724b98687ab5663ff84515eaa9bba570&playerId=fDimCsmSzViWrxSA3Sx9ECNzoZ1I&page=1";

// Boutons pré-remplis pour l'analyse détaillée (Lot 2, Priorité 5B) —
// classés par moment de la partie, pour une saisie rapide en un clic.
const OPENING_HAND_OPTIONS = [
  "Excellente", "Bonne", "Moyenne", "Mauvaise",
  "Trop de cartes sans Counter", "Aucun coût 5+", "ST32-003 sans cible",
  "Trop de boss", "Trop d'Events", "Aucune carte de setup",
];
const EARLY_GAME_MISTAKES = [
  "Mauvais mulligan", "Mauvaise courbe", "Mauvaise gestion du DON!!",
  "Setup coût 1 absent", "Première menace posée trop tard",
  "Trop de vies prises", "Trop de ressources utilisées en défense",
];
const MID_GAME_MISTAKES = [
  "J'ai attaqué la vie trop tôt", "Je n'ai pas contrôlé le board",
  "Mauvaise cible reposée", "Mauvaise cible gelée",
  "Effet Mihawk activé trop tôt", "Effet Mihawk oublié",
  "ST32-003 mal utilisé", "Mauvaise cible jouée par ST32-003",
  "DON!! récupérés mais inutilisés", "Smoker mal protégé",
  "Surdéveloppement du board", "Mauvais ordre des effets",
];
const LATE_GAME_MISTAKES = [
  "Létal manqué", "Mauvais ordre d'attaque", "Aucun calcul avant d'attaquer",
  "Pas assez de Counter", "Boss joué trop tard", "Law & Bepo mal préparé",
  "Rush adverse non anticipé", "Mauvaise défense de la vie",
  "Partie trop longue", "Décision sous pression", "Temps dépassé",
];

type Tab = "planning" | "journal" | "stats" | "objectifs" | "matchups";

export default function PrepPage() {
  const [tab, setTab] = useState<Tab>("planning");
  const daysLeft = useMemo(() => {
    const diff = Math.ceil((new Date(TOURNAMENT_DATE).getTime() - Date.now()) / 86400000);
    return diff >= 0 ? diff : 0;
  }, []);

  return (
    <div className="space-y-6">
      <div className="card-tile rounded-sm p-4 flex items-center justify-between">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-gold">Préparation tournoi</div>
          <div className="text-white text-sm flex items-center gap-2 flex-wrap">
            Leaders engagés :
            <span className="badge badge-green inline-flex items-center gap-1.5">
              <LeaderImage leaderKey="mihawk" size={18} /> Mihawk OP14-020
            </span>
            <span className="badge badge-gold inline-flex items-center gap-1.5">
              <LeaderImage leaderKey="shanks" size={18} /> Shanks OP17
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-mono text-gold">{daysLeft}</div>
          <div className="text-[10px] uppercase tracking-wider text-steel/60">jours avant le 20 sept.</div>
        </div>
      </div>

      <nav className="flex gap-1 border-b border-line overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        {(["planning", "journal", "stats", "matchups", "objectifs"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3.5 py-2 text-xs font-mono uppercase tracking-wider border-b-2 whitespace-nowrap shrink-0 ${
              tab === t ? "text-gold border-gold" : "text-steel/60 border-transparent hover:text-white"
            }`}
          >
            {{ planning: "Planning", journal: "Journal", stats: "Statistiques", matchups: "Matchups", objectifs: "Objectifs" }[t]}
          </button>
        ))}
      </nav>

      {tab === "planning" && <PlanningTab />}
      {tab === "journal" && <JournalTab />}
      {tab === "stats" && <StatsTab />}
      {tab === "matchups" && <MatchupsTab />}
      {tab === "objectifs" && <ObjectifsTab />}
    </div>
  );
}

function PlanningTab() {
  return (
    <div className="space-y-3">
      {WEEKS.map((w) => (
        <div key={w.n} className="card-tile rounded-sm p-4">
          <div className="text-[11px] font-mono text-steel/60 uppercase tracking-wider">Semaine {w.n} · {w.range}</div>
          <p className="text-sm text-white mt-1 mb-3">{w.focus}</p>
          <div className="flex gap-6 font-mono text-xs">
            <div><span className="text-gold text-lg block">{w.sim}</span><span className="text-steel/60">Simulateur</span></div>
            <div><span className="text-gold text-lg block">{w.bout}</span><span className="text-steel/60">Boutique</span></div>
            <div><span className="text-gold text-lg block">{w.sim + w.bout}</span><span className="text-steel/60">Total visé</span></div>
          </div>
          <div className={`mt-2 pt-2 border-t border-line text-xs font-mono ${w.warn ? "text-red-400" : "text-emerald-bright"}`}>{w.milestone}</div>
        </div>
      ))}
    </div>
  );
}

function JournalTab() {
  const [matches, setMatches] = useState<any[]>([]);
  const [filterDeck, setFilterDeck] = useState("");
  const [filterMode, setFilterMode] = useState("");
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    mode: "Simulateur",
    myDeck: MY_DECKS[0],
    opponentLeader: "",
    result: "Victoire",
    cardsToWatch: "",
    notes: "",
    turnOrder: "",
    mulligan: "",
    openingHandQuality: "",
    mainMistake: "",
    mostUsefulCard: "",
    uselessCard: "",
    keyTurn: "",
    confidence: "",
    donRecoveredUnused: "",
    cardsInHandEnd: "",
    opponentLifeRemaining: "",
    gameDurationMinutes: "",
    mihawkActivations: "",
    mihawkEffectForgotten: "",
    mihawkEffectTooEarly: "",
    firstCost5Turn: "",
    decisiveMoment: "",
  });
  const [showQuickDetails, setShowQuickDetails] = useState(false);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterDeck) params.set("myDeck", filterDeck);
    if (filterMode) params.set("mode", filterMode);
    const res = await fetch(`/api/matches?${params.toString()}`);
    const data = await res.json();
    setMatches(data.matches ?? []);
  }, [filterDeck, filterMode]);

  useEffect(() => {
    load();
  }, [load]);

  async function addMatch() {
    if (!form.date || !form.opponentLeader) {
      alert("Renseigne au moins la date et le leader adverse.");
      return;
    }
    const toNum = (v: string) => (v === "" ? null : Number(v));
    const toBool = (v: string) => (v === "" ? null : v === "true");
    const payload = {
      ...form,
      mulligan: toBool(form.mulligan),
      confidence: toNum(form.confidence),
      donRecoveredUnused: toNum(form.donRecoveredUnused),
      cardsInHandEnd: toNum(form.cardsInHandEnd),
      opponentLifeRemaining: toNum(form.opponentLifeRemaining),
      gameDurationMinutes: toNum(form.gameDurationMinutes),
      mihawkActivations: toNum(form.mihawkActivations),
      mihawkEffectForgotten: toBool(form.mihawkEffectForgotten),
      mihawkEffectTooEarly: toBool(form.mihawkEffectTooEarly),
      firstCost5Turn: toNum(form.firstCost5Turn),
    };
    await fetch("/api/matches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setForm((f) => ({
      ...f,
      opponentLeader: "", cardsToWatch: "", notes: "",
      turnOrder: "", mulligan: "", openingHandQuality: "", mainMistake: "", mostUsefulCard: "", uselessCard: "", keyTurn: "",
      confidence: "", donRecoveredUnused: "", cardsInHandEnd: "", opponentLifeRemaining: "", gameDurationMinutes: "",
      mihawkActivations: "", mihawkEffectForgotten: "", mihawkEffectTooEarly: "", firstCost5Turn: "", decisiveMoment: "",
    }));
    setShowDetailedAnalysis(false);
    load();
  }

  async function deleteMatch(id: string) {
    const m = matches.find((x) => x.id === id);
    const label = m ? `du ${m.date} contre ${m.opponentLeader} (${m.result})` : "";
    if (!confirm(`Supprimer définitivement cette partie ${label} ? Cette action est irréversible.`)) return;
    await fetch(`/api/matches/${id}`, { method: "DELETE" });
    load();
  }

  const [kaizokuText, setKaizokuText] = useState("");
  const [kaizokuBusy, setKaizokuBusy] = useState(false);
  const [kaizokuResult, setKaizokuResult] = useState<{ parsed: number; inserted: number; skipped: number; warnings: string[] } | null>(null);
  const [kaizokuMode, setKaizokuMode] = useState<"Simulateur" | "Boutique">("Simulateur");
  const [showKaizoku, setShowKaizoku] = useState(false);

  async function importKaizoku() {
    if (!kaizokuText.trim()) return;
    setKaizokuBusy(true);
    setKaizokuResult(null);
    try {
      const res = await fetch("/api/matches/sync-kaizoku", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: kaizokuText, mode: kaizokuMode }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error ?? `Erreur ${res.status}`);
      setKaizokuResult({ parsed: data.parsed, inserted: data.inserted, skipped: data.skipped, warnings: data.warnings ?? [] });
      if (data.inserted > 0) {
        setKaizokuText("");
        load();
      }
    } catch (e: any) {
      setKaizokuResult({ parsed: 0, inserted: 0, skipped: 0, warnings: [e?.message ?? "Erreur inconnue."] });
    } finally {
      setKaizokuBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="card-tile rounded-sm p-5">
        <div className="flex items-center justify-between">
          <button onClick={() => setShowKaizoku((s) => !s)} className="flex items-center gap-3 text-left">
            <h3 className="font-mono text-xs uppercase tracking-widest text-gold">Importer depuis Card D. Kaizoku</h3>
            <span className="text-textMuted text-xs">{showKaizoku ? "Masquer ▲" : "Ouvrir ▼"}</span>
          </button>
          <a
            href={KAIZOKU_HISTORY_URL}
            target="_blank"
            rel="noreferrer"
            className="btn text-xs py-1.5 px-3 shrink-0"
          >
            🔗 Voir mes matchs sur Kaizoku
          </a>
        </div>
        {showKaizoku && (
          <div className="mt-3 pt-3 border-t border-line space-y-3">
            <div className="text-xs text-steel/70">
              Va sur ta page d'historique Kaizoku, sélectionne tout le tableau de matchs (Ctrl+A / Cmd+A dans la zone du tableau, ou copie manuellement), colle-le ci-dessous. Les parties déjà importées sont automatiquement ignorées — tu peux recoller la même page plusieurs fois sans risque de doublon.
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-mono uppercase text-steel/60">Mode</label>
              <select className="input" value={kaizokuMode} onChange={(e) => setKaizokuMode(e.target.value as "Simulateur" | "Boutique")}>
                <option>Simulateur</option>
                <option>Boutique</option>
              </select>
            </div>
            <textarea
              className="input w-full font-mono text-xs"
              rows={8}
              placeholder={"07/08/2026\n11:25\nDracule Mihawk [OP14-020]\n\nRocks.D.Xebec [OP17-039] Won\n..."}
              value={kaizokuText}
              onChange={(e) => setKaizokuText(e.target.value)}
            />
            <button onClick={importKaizoku} disabled={kaizokuBusy || !kaizokuText.trim()} className="btn btn-primary">
              {kaizokuBusy ? "Import en cours..." : "Analyser et importer"}
            </button>
            {kaizokuResult && (
              <div className="text-xs font-mono bg-panel2 p-3 rounded-lg space-y-1">
                <div>{kaizokuResult.parsed} partie(s) reconnue(s) · <span className="text-emerald-bright">{kaizokuResult.inserted} ajoutée(s)</span> · {kaizokuResult.skipped} déjà connue(s) (ignorée(s))</div>
                {kaizokuResult.warnings.map((w, i) => (
                  <div key={i} className="text-gold">⚠ {w}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card-tile rounded-sm p-5">
        <h3 className="font-mono text-xs uppercase tracking-widest text-gold mb-3 border-b border-line pb-2">Enregistrer une partie</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1">Date</label>
            <input type="date" className="input w-full" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          </div>
          <div>
            <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1">Mode</label>
            <select className="input w-full" value={form.mode} onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value }))}>
              <option>Simulateur</option>
              <option>Boutique</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1">Mon deck</label>
            <select className="input w-full" value={form.myDeck} onChange={(e) => setForm((f) => ({ ...f, myDeck: e.target.value }))}>
              {MY_DECKS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1">Résultat</label>
            <select
              className="input w-full"
              value={form.result}
              onChange={(e) => {
                const value = e.target.value;
                setForm((f) => ({ ...f, result: value }));
                if (value === "Défaite") setShowDetailedAnalysis(true);
              }}
            >
              <option>Victoire</option>
              <option>Défaite</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1">Leader adverse</label>
            <input list="leaders" className="input w-full" placeholder="ex. Enel, Luffy Vert/Bleu..." value={form.opponentLeader} onChange={(e) => setForm((f) => ({ ...f, opponentLeader: e.target.value }))} />
            <datalist id="leaders">{OPPONENT_LEADERS.map((l) => <option key={l} value={l} />)}</datalist>
          </div>
          <div className="md:col-span-2">
            <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1">Carte(s) à surveiller</label>
            <input className="input w-full" value={form.cardsToWatch} onChange={(e) => setForm((f) => ({ ...f, cardsToWatch: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1">Notes</label>
            <textarea className="input w-full" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>

        <button
          onClick={() => setShowQuickDetails((s) => !s)}
          className="text-xs font-mono text-emerald-bright mt-3 flex items-center gap-1"
        >
          {showQuickDetails ? "▲ Masquer les détails (facultatif)" : "▼ Ajouter des détails (facultatif, ~15s)"}
        </button>

        {showQuickDetails && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-line">
            <div>
              <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1">Premier / Second</label>
              <select className="input w-full" value={form.turnOrder} onChange={(e) => setForm((f) => ({ ...f, turnOrder: e.target.value }))}>
                <option value="">—</option>
                <option>Premier</option>
                <option>Second</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1">Mulligan</label>
              <select className="input w-full" value={form.mulligan} onChange={(e) => setForm((f) => ({ ...f, mulligan: e.target.value }))}>
                <option value="">—</option>
                <option value="true">Oui</option>
                <option value="false">Non</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1">Qualité de la main initiale</label>
              <select className="input w-full" value={form.openingHandQuality} onChange={(e) => setForm((f) => ({ ...f, openingHandQuality: e.target.value }))}>
                <option value="">—</option>
                <option>Bonne</option>
                <option>Correcte</option>
                <option>Mauvaise</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1">Tour / moment décisif</label>
              <input className="input w-full" placeholder="ex. Tour 4" value={form.keyTurn} onChange={(e) => setForm((f) => ({ ...f, keyTurn: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1">Erreur principale</label>
              <select className="input w-full" value={form.mainMistake} onChange={(e) => setForm((f) => ({ ...f, mainMistake: e.target.value }))}>
                <option value="">—</option>
                {QUICK_MISTAKES.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1">Carte la plus utile</label>
              <input className="input w-full" placeholder="ex. OP14-023" value={form.mostUsefulCard} onChange={(e) => setForm((f) => ({ ...f, mostUsefulCard: e.target.value }))} />
            </div>
            <div>
              <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1">Carte inutile</label>
              <input className="input w-full" placeholder="ex. OP14-030" value={form.uselessCard} onChange={(e) => setForm((f) => ({ ...f, uselessCard: e.target.value }))} />
            </div>
          </div>
        )}

        <button
          onClick={() => setShowDetailedAnalysis((s) => !s)}
          className="text-xs font-mono text-gold mt-2 flex items-center gap-1"
        >
          {showDetailedAnalysis ? "▲ Masquer l'analyse détaillée" : "▼ Analyse détaillée (facultatif — s'ouvre seule sur défaite)"}
        </button>

        {showDetailedAnalysis && (
          <div className="space-y-4 mt-3 pt-3 border-t border-line">
            <div>
              <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1.5">Main initiale</label>
              <div className="flex flex-wrap gap-1.5">
                {OPENING_HAND_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, openingHandQuality: opt }))}
                    className={`chip ${form.openingHandQuality === opt ? "chip-active" : ""}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1.5">Début de partie</label>
              <div className="flex flex-wrap gap-1.5">
                {EARLY_GAME_MISTAKES.map((opt) => (
                  <button key={opt} type="button" onClick={() => setForm((f) => ({ ...f, mainMistake: opt }))} className={`chip ${form.mainMistake === opt ? "chip-active" : ""}`}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1.5">Milieu de partie</label>
              <div className="flex flex-wrap gap-1.5">
                {MID_GAME_MISTAKES.map((opt) => (
                  <button key={opt} type="button" onClick={() => setForm((f) => ({ ...f, mainMistake: opt }))} className={`chip ${form.mainMistake === opt ? "chip-active" : ""}`}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1.5">Fin de partie</label>
              <div className="flex flex-wrap gap-1.5">
                {LATE_GAME_MISTAKES.map((opt) => (
                  <button key={opt} type="button" onClick={() => setForm((f) => ({ ...f, mainMistake: opt }))} className={`chip ${form.mainMistake === opt ? "chip-active" : ""}`}>
                    {opt}
                  </button>
                ))}
              </div>
              {form.mainMistake && <div className="text-[10px] text-steel/50 mt-1">Erreur principale sélectionnée : {form.mainMistake}</div>}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1">Tour 1er coût 5+</label>
                <input type="number" min={0} className="input w-full" value={form.firstCost5Turn} onChange={(e) => setForm((f) => ({ ...f, firstCost5Turn: e.target.value }))} />
              </div>
              <div>
                <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1">Activations Mihawk</label>
                <input type="number" min={0} className="input w-full" value={form.mihawkActivations} onChange={(e) => setForm((f) => ({ ...f, mihawkActivations: e.target.value }))} />
              </div>
              <div>
                <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1">DON!! récup. inutilisés</label>
                <input type="number" min={0} className="input w-full" value={form.donRecoveredUnused} onChange={(e) => setForm((f) => ({ ...f, donRecoveredUnused: e.target.value }))} />
              </div>
              <div>
                <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1">Cartes en main (fin)</label>
                <input type="number" min={0} className="input w-full" value={form.cardsInHandEnd} onChange={(e) => setForm((f) => ({ ...f, cardsInHandEnd: e.target.value }))} />
              </div>
              <div>
                <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1">Vies adverses restantes</label>
                <input type="number" min={0} className="input w-full" value={form.opponentLifeRemaining} onChange={(e) => setForm((f) => ({ ...f, opponentLifeRemaining: e.target.value }))} />
              </div>
              <div>
                <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1">Durée (minutes)</label>
                <input type="number" min={0} className="input w-full" value={form.gameDurationMinutes} onChange={(e) => setForm((f) => ({ ...f, gameDurationMinutes: e.target.value }))} />
              </div>
              <div>
                <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1">Confiance (1-5)</label>
                <input type="number" min={1} max={5} className="input w-full" value={form.confidence} onChange={(e) => setForm((f) => ({ ...f, confidence: e.target.value }))} />
              </div>
            </div>

            <div className="flex gap-4 flex-wrap">
              <label className="flex items-center gap-2 text-xs text-steel/80">
                <input type="checkbox" checked={form.mihawkEffectForgotten === "true"} onChange={(e) => setForm((f) => ({ ...f, mihawkEffectForgotten: e.target.checked ? "true" : "false" }))} />
                Effet Mihawk oublié
              </label>
              <label className="flex items-center gap-2 text-xs text-steel/80">
                <input type="checkbox" checked={form.mihawkEffectTooEarly === "true"} onChange={(e) => setForm((f) => ({ ...f, mihawkEffectTooEarly: e.target.checked ? "true" : "false" }))} />
                Effet Mihawk activé trop tôt
              </label>
            </div>

            <div>
              <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1">Menace adverse déterminante / moment clé</label>
              <input className="input w-full" placeholder="ex. Board Xebec trop développé au tour 5" value={form.decisiveMoment} onChange={(e) => setForm((f) => ({ ...f, decisiveMoment: e.target.value }))} />
            </div>
          </div>
        )}

        <button onClick={addMatch} className="btn btn-primary mt-3">Ajouter la partie</button>
      </div>

      <div className="card-tile rounded-sm p-5">
        <h3 className="font-mono text-xs uppercase tracking-widest text-gold mb-3 border-b border-line pb-2">Historique</h3>
        <div className="flex gap-2 mb-3">
          <select className="input" value={filterDeck} onChange={(e) => setFilterDeck(e.target.value)}>
            <option value="">Tous mes decks</option>
            {MY_DECKS.map((d) => <option key={d}>{d}</option>)}
          </select>
          <select className="input" value={filterMode} onChange={(e) => setFilterMode(e.target.value)}>
            <option value="">Simulateur + Boutique</option>
            <option>Simulateur</option>
            <option>Boutique</option>
          </select>
        </div>
        {matches.length === 0 ? (
          <div className="text-steel/60 text-sm font-mono">Aucune partie enregistrée pour ce filtre.</div>
        ) : (
          <div className="table-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] font-mono uppercase text-steel/60 border-b border-line">
                <th className="text-left py-1">Date</th><th className="text-left">Mode</th><th className="text-left">Deck</th><th className="text-left">Adversaire</th><th className="text-left">Résultat</th><th></th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => (
                <tr key={m.id} className="border-b border-line/50">
                  <td className="py-1.5 font-mono text-xs">{m.date}</td>
                  <td className="text-xs">{m.mode}</td>
                  <td>
                    <span className={`badge ${m.myDeck.includes("Mihawk") ? "badge-green" : "badge-gold"} inline-flex items-center gap-1`}>
                      <LeaderImage leaderKey={m.myDeck.includes("Mihawk") ? "mihawk" : "shanks"} size={14} />
                      {m.myDeck.includes("Mihawk") ? "Mihawk" : "Shanks"}
                    </span>
                  </td>
                  <td className="text-xs">
                    <OpponentLeaderBadge label={m.opponentLeader} size={20} />
                    {m.cardsToWatch && <div className="text-steel/60">⚠ {m.cardsToWatch}</div>}
                  </td>
                  <td><span className={`badge ${m.result === "Victoire" ? "badge-green" : "badge-red"}`}>{m.result === "Victoire" ? "V" : "D"}</span></td>
                  <td><button onClick={() => deleteMatch(m.id)} className="text-steel/60 hover:text-red-400">✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatsTab() {
  const [matches, setMatches] = useState<any[]>([]);
  useEffect(() => {
    fetch("/api/matches").then((r) => r.json()).then((d) => setMatches(d.matches ?? []));
  }, []);

  const total = matches.length;
  const wins = matches.filter((m) => m.result === "Victoire").length;
  const winrate = total ? Math.round((wins / total) * 100) : 0;

  const byDeck: Record<string, { t: number; w: number }> = {};
  matches.forEach((m) => {
    byDeck[m.myDeck] = byDeck[m.myDeck] || { t: 0, w: 0 };
    byDeck[m.myDeck].t++;
    if (m.result === "Victoire") byDeck[m.myDeck].w++;
  });

  const byOpp: Record<string, { t: number; w: number; l: number }> = {};
  matches.forEach((m) => {
    byOpp[m.opponentLeader] = byOpp[m.opponentLeader] || { t: 0, w: 0, l: 0 };
    byOpp[m.opponentLeader].t++;
    if (m.result === "Victoire") byOpp[m.opponentLeader].w++;
    else byOpp[m.opponentLeader].l++;
  });
  const oppRows = Object.entries(byOpp)
    .map(([opp, d]) => ({ opp, ...d, wr: Math.round((d.w / d.t) * 100) }))
    .sort((a, b) => a.wr - b.wr);

  const threats = oppRows.filter((r) => r.t >= 2 && r.wr < 50);

  return (
    <div className="space-y-6">
      <CoachBilanSection />

      <div className="card-tile rounded-sm p-5">
        <h3 className="font-mono text-xs uppercase tracking-widest text-gold mb-3 border-b border-line pb-2">Vue d'ensemble</h3>
        <div className="flex gap-4 flex-wrap">
          <div className="bg-panel2 rounded p-3 text-center min-w-[100px]"><div className="text-2xl font-mono text-emerald-bright">{total}</div><div className="text-[10px] uppercase text-steel/60">Parties</div></div>
          <div className="bg-panel2 rounded p-3 text-center min-w-[100px]"><div className="text-2xl font-mono text-emerald-bright">{winrate}%</div><div className="text-[10px] uppercase text-steel/60">Winrate global</div></div>
          {Object.entries(byDeck).map(([deck, d]) => (
            <div key={deck} className="bg-panel2 rounded p-3 text-center min-w-[100px]">
              <div className="text-2xl font-mono text-gold">{Math.round((d.w / d.t) * 100)}%</div>
              <div className="text-[10px] uppercase text-steel/60">{deck.includes("Mihawk") ? "Mihawk" : "Shanks"} ({d.t})</div>
            </div>
          ))}
        </div>
        {total < 5 && <div className="text-xs font-mono text-steel/60 mt-3">Continue à logger — encore {5 - total} partie(s) avant que les tendances par adversaire deviennent fiables.</div>}
      </div>

      <div className="card-tile rounded-sm p-5">
        <h3 className="font-mono text-xs uppercase tracking-widest text-gold mb-3 border-b border-line pb-2">Bilan par leader adverse</h3>
        {threats.length > 0 && (
          <div className="text-xs font-mono text-red-400 mb-2">À surveiller (≥2 parties, winrate &lt;50%) : {threats.map((t) => t.opp).join(", ")}</div>
        )}
        {oppRows.length === 0 ? (
          <div className="text-steel/60 text-sm font-mono">Pas encore de données.</div>
        ) : (
          <div className="table-scroll">
          <table className="w-full text-sm">
            <thead><tr className="text-[10px] font-mono uppercase text-steel/60 border-b border-line"><th className="text-left py-1">Leader</th><th>Parties</th><th>V</th><th>D</th><th>Winrate</th></tr></thead>
            <tbody>
              {oppRows.map((r) => (
                <tr key={r.opp} className="border-b border-line/50">
                  <td className={`py-1.5 ${r.wr < 45 ? "text-red-400" : r.wr > 65 ? "text-emerald-bright" : "text-white"}`}>
                    <OpponentLeaderBadge label={r.opp} size={20} />
                  </td>
                  <td className="text-center">{r.t}</td><td className="text-center">{r.w}</td><td className="text-center">{r.l}</td>
                  <td className={`text-center font-mono ${r.wr < 45 ? "text-red-400" : r.wr > 65 ? "text-emerald-bright" : "text-white"}`}>{r.wr}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      <PersonalStatsSection />
    </div>
  );
}

function DataInsufficient({ reason }: { reason?: string }) {
  return <div className="text-xs font-mono text-steel/60">Données insuffisantes — {reason}</div>;
}

function CoachBilanSection() {
  const [bilan, setBilan] = useState<any>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    fetch("/api/coach/bilan")
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) throw new Error();
        setBilan(d.bilan);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, []);

  if (state === "loading") return <div className="card-tile rounded-sm p-5 border-emerald/40"><div className="skeleton h-16" /></div>;
  if (state === "error" || !bilan) return null;

  if (!bilan.hasData) {
    return (
      <div className="card-tile rounded-sm p-5 border-emerald/40">
        <h3 className="font-mono text-xs uppercase tracking-widest text-gold mb-2 border-b border-line pb-2">🧑‍🏫 Bilan Coach</h3>
        <DataInsufficient reason={bilan.reason} />
      </div>
    );
  }

  const badgeFor = (level: string) =>
    level === "Tendance suffisamment observée" ? "badge-green" : level === "Tendance provisoire" ? "badge-gold" : "badge";

  return (
    <div className="card-tile rounded-sm p-5 border-emerald/40">
      <h3 className="font-mono text-xs uppercase tracking-widest text-gold mb-3 border-b border-line pb-2">🧑‍🏫 Bilan Coach — {bilan.sampleSize} parties</h3>
      <div className="space-y-3 text-sm">
        {bilan.progress && (
          <div>
            <span className={`badge ${badgeFor(bilan.progress.level)} mr-2`}>{bilan.progress.level}</span>
            Progrès observé : <span className="text-white font-mono">{bilan.progress.recentWinrate}%</span> sur les 10 dernières parties, contre {bilan.progress.previousWinrate}% avant — {bilan.progress.delta >= 0 ? "↑" : "↓"} {Math.abs(bilan.progress.delta)} points.
          </div>
        )}
        {bilan.mostFrequentMistake && (
          <div>
            <span className={`badge ${badgeFor(bilan.mostFrequentMistake.level)} mr-2`}>{bilan.mostFrequentMistake.level}</span>
            Erreur la plus fréquente : <span className="text-white">{bilan.mostFrequentMistake.mistake}</span> ({bilan.mostFrequentMistake.count} fois)
          </div>
        )}
        {bilan.hardestMatchup && (
          <div>
            <span className={`badge ${badgeFor(bilan.hardestMatchup.level)} mr-2`}>{bilan.hardestMatchup.level}</span>
            Matchup le plus difficile : <OpponentLeaderBadge label={bilan.hardestMatchup.opponent} size={18} /> ({bilan.hardestMatchup.winrate}% sur {bilan.hardestMatchup.sampleSize})
          </div>
        )}
        {bilan.firstVsSecond && (
          <div>
            <span className={`badge ${badgeFor(bilan.firstVsSecond.level)} mr-2`}>{bilan.firstVsSecond.level}</span>
            Premier {bilan.firstVsSecond.firstWinrate}% vs Second {bilan.firstVsSecond.secondWinrate}%
          </div>
        )}
        {bilan.avgDuration && <div>Durée moyenne : <span className="text-white font-mono">{bilan.avgDuration} min</span></div>}
        {bilan.usefulCard && (
          <div>
            <span className={`badge ${badgeFor(bilan.usefulCard.level)} mr-2`}>{bilan.usefulCard.level}</span>
            Carte souvent utile : <span className="text-white">{bilan.usefulCard.card}</span> ({bilan.usefulCard.count} fois)
          </div>
        )}
        {bilan.deadCard && (
          <div>
            <span className={`badge ${badgeFor(bilan.deadCard.level)} mr-2`}>{bilan.deadCard.level}</span>
            Carte souvent morte : <span className="text-white">{bilan.deadCard.card}</span> ({bilan.deadCard.count} fois)
          </div>
        )}
        {bilan.nextTrainingGoal && (
          <div className="pt-2 border-t border-line mt-2 text-emerald-bright">🎯 {bilan.nextTrainingGoal}</div>
        )}
      </div>
    </div>
  );
}

function PersonalStatsSection() {
  const [stats, setStats] = useState<any>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    fetch("/api/stats/personal")
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) throw new Error();
        setStats(d.stats);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, []);

  if (state === "loading") return <div className="card-tile rounded-sm p-5"><div className="skeleton h-20" /></div>;
  if (state === "error" || !stats) return <div className="card-tile rounded-sm p-5 text-xs text-danger">Impossible de charger les statistiques personnelles.</div>;

  return (
    <>
      <div className="card-tile rounded-sm p-5">
        <h3 className="font-mono text-xs uppercase tracking-widest text-gold mb-3 border-b border-line pb-2">Premier / Second</h3>
        {!stats.firstSecond.hasData ? (
          <DataInsufficient reason={stats.firstSecond.reason} />
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-panel2 rounded p-3 text-center">
              <div className="text-xl font-mono text-emerald-bright">{stats.firstSecond.first.winrate}%</div>
              <div className="text-[10px] uppercase text-steel/60">Premier ({stats.firstSecond.first.total})</div>
              {stats.firstSecond.first.avgDuration && <div className="text-[10px] text-steel/50 mt-1">~{stats.firstSecond.first.avgDuration} min en moyenne</div>}
            </div>
            <div className="bg-panel2 rounded p-3 text-center">
              <div className="text-xl font-mono text-gold">{stats.firstSecond.second.winrate}%</div>
              <div className="text-[10px] uppercase text-steel/60">Second ({stats.firstSecond.second.total})</div>
              {stats.firstSecond.second.avgDuration && <div className="text-[10px] text-steel/50 mt-1">~{stats.firstSecond.second.avgDuration} min en moyenne</div>}
            </div>
          </div>
        )}
      </div>

      <div className="card-tile rounded-sm p-5">
        <h3 className="font-mono text-xs uppercase tracking-widest text-gold mb-3 border-b border-line pb-2">Mulligan</h3>
        {!stats.mulligan.hasData ? (
          <DataInsufficient reason={stats.mulligan.reason} />
        ) : (
          <div className="space-y-2 text-sm">
            <div>Taux de mulligan : <span className="text-white font-mono">{stats.mulligan.mulliganRate}%</span></div>
            {stats.mulligan.winrateWithMulligan !== undefined && <div>Winrate avec mulligan : <span className="text-white font-mono">{stats.mulligan.winrateWithMulligan}%</span></div>}
            {stats.mulligan.winrateWithoutMulligan !== undefined && <div>Winrate sans mulligan : <span className="text-white font-mono">{stats.mulligan.winrateWithoutMulligan}%</span></div>}
            {stats.mulligan.byHandQuality && Object.keys(stats.mulligan.byHandQuality).length > 0 && (
              <div className="pt-2 border-t border-line mt-2">
                <div className="text-[10px] uppercase text-steel/60 mb-1">Par qualité de main</div>
                {Object.entries(stats.mulligan.byHandQuality).map(([q, d]: [string, any]) => (
                  <div key={q} className="text-xs text-steel/80">{q} — {d.winrate}% ({d.total} partie{d.total > 1 ? "s" : ""})</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card-tile rounded-sm p-5">
        <h3 className="font-mono text-xs uppercase tracking-widest text-gold mb-3 border-b border-line pb-2">Mihawk — effet Leader</h3>
        {!stats.mihawk.hasData ? (
          <DataInsufficient reason={stats.mihawk.reason} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="bg-panel2 rounded p-3 text-center">
              <div className="text-lg font-mono text-emerald-bright">{stats.mihawk.avgActivations ?? "—"}</div>
              <div className="text-[10px] uppercase text-steel/60">Activations / partie</div>
            </div>
            <div className="bg-panel2 rounded p-3 text-center">
              <div className="text-lg font-mono text-gold">{stats.mihawk.avgFirstCost5Turn ?? "—"}</div>
              <div className="text-[10px] uppercase text-steel/60">Tour 1er coût 5+</div>
            </div>
            <div className="bg-panel2 rounded p-3 text-center">
              <div className="text-lg font-mono text-red-400">{stats.mihawk.effectForgottenRate ?? "—"}%</div>
              <div className="text-[10px] uppercase text-steel/60">Effet oublié</div>
            </div>
            <div className="bg-panel2 rounded p-3 text-center">
              <div className="text-lg font-mono text-red-400">{stats.mihawk.effectTooEarlyRate ?? "—"}%</div>
              <div className="text-[10px] uppercase text-steel/60">Activé trop tôt</div>
            </div>
          </div>
        )}
      </div>

      <div className="card-tile rounded-sm p-5">
        <h3 className="font-mono text-xs uppercase tracking-widest text-gold mb-3 border-b border-line pb-2">Style de jeu — erreurs fréquentes</h3>
        {!stats.style.hasData ? (
          <DataInsufficient reason={stats.style.reason} />
        ) : (
          <div className="space-y-1">
            {stats.style.topMistakes.map((m: any) => (
              <div key={m.mistake} className="flex justify-between text-sm">
                <span className="text-steel/80">{m.mistake}</span>
                <span className="text-white font-mono">{m.count}×</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function ObjectifsTab() {
  const [items, setItems] = useState<any[]>([]);
  const [infos, setInfos] = useState<Record<number, string>>({});
  const [addText, setAddText] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const [oRes, iRes] = await Promise.all([fetch("/api/objectives"), fetch("/api/weekly-infos")]);
    const oData = await oRes.json();
    const iData = await iRes.json();
    setItems(oData.items ?? []);
    const map: Record<number, string> = {};
    (iData.infos ?? []).forEach((i: any) => (map[i.weekNumber] = i.content));
    setInfos(map);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(id: string, done: boolean) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, done } : it)));
    await fetch(`/api/objectives/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ done }) });
  }

  async function addCustom(category: string) {
    const text = addText[category]?.trim();
    if (!text) return;
    await fetch("/api/objectives", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category, text }) });
    setAddText((f) => ({ ...f, [category]: "" }));
    load();
  }

  async function saveInfo(weekNumber: number, content: string) {
    setInfos((prev) => ({ ...prev, [weekNumber]: content }));
    await fetch("/api/weekly-infos", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weekNumber, content }) });
  }

  const categories: { key: string; label: string }[] = [
    { key: "meta", label: "Connaissance de la méta" },
    { key: "cartes", label: "Cartes clés à connaître" },
    { key: "strat", label: "Stratégies / menaces à surveiller" },
    { key: "matchups", label: "Matchups à travailler" },
  ];

  return (
    <div className="space-y-6">
      {categories.map((cat) => (
        <div key={cat.key} className="card-tile rounded-sm p-5">
          <h3 className="font-mono text-xs uppercase tracking-widest text-gold mb-3 border-b border-line pb-2">{cat.label}</h3>
          <ul className="space-y-1.5">
            {items.filter((it) => it.category === cat.key).map((it) => (
              <li key={it.id} className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={it.done} onChange={(e) => toggle(it.id, e.target.checked)} className="mt-1" />
                <span className={it.done ? "text-steel/50 line-through" : "text-white"}>{it.text}</span>
              </li>
            ))}
          </ul>
          <div className="flex gap-2 mt-3">
            <input className="input flex-1" placeholder="Ajouter un objectif..." value={addText[cat.key] ?? ""} onChange={(e) => setAddText((f) => ({ ...f, [cat.key]: e.target.value }))} />
            <button onClick={() => addCustom(cat.key)} className="btn btn-primary">Ajouter</button>
          </div>
        </div>
      ))}

      <div className="card-tile rounded-sm p-5">
        <h3 className="font-mono text-xs uppercase tracking-widest text-gold mb-3 border-b border-line pb-2">5 infos importantes par semaine</h3>
        {WEEKS.map((w) => (
          <div key={w.n} className="mb-3">
            <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1">Semaine {w.n} — {w.range}</label>
            <textarea
              className="input w-full"
              rows={3}
              placeholder={"1. ...\n2. ...\n3. ...\n4. ...\n5. ..."}
              value={infos[w.n] ?? ""}
              onChange={(e) => setInfos((prev) => ({ ...prev, [w.n]: e.target.value }))}
              onBlur={(e) => saveInfo(w.n, e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchupsTab() {
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
