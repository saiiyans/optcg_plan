"use client";
import { useEffect, useState, useCallback, useRef, Fragment } from "react";
import { MY_DECKS } from "@/lib/planningData";
import { useOpponentLeaders } from "@/lib/useOpponentLeaders";
import { LeaderImage } from "@/components/LeaderImage";
import { OpponentLeaderBadge } from "@/components/OpponentLeaderBadge";
import { CoachBilanSection, MatchesOverview, PersonalStatsSection } from "@/components/PerformanceStats";
import { QUICK_MISTAKES } from "@/lib/coachDiagnostic";
import { MISTAKE_CATEGORIES } from "@/lib/defeatAnalysis";
import { TrainingPriorityCard, MistakeTrendSection, MatchDefeatPanel, SkillScoresSection } from "@/components/DefeatAnalysis";
import { EntrainementDuJour } from "@/components/EntrainementDuJour";
import { notifyMatchLogged } from "@/lib/trainingCounterBus";
import { KAIZOKU_HISTORY_URL, OPENING_HAND_OPTIONS, DECK_SPECIFIC_MISTAKES } from "@/lib/journalConstants";

// --- /journal (section 5) — page unique, sans sous-onglets. Contient
// l'entraînement du jour, la saisie rapide (<20s, section 6), l'historique
// (avec analyse du coach par défaite), la priorité d'entraînement, et un
// résumé des statistiques. Les fiches matchups et statistiques complètes
// détaillées restent sur leurs propres pages (Matchup Center, Stats).

type PhaseFilter = "" | "official_training" | "test";

export default function JournalPage() {
  const opponentLeaders = useOpponentLeaders();
  const [matches, setMatches] = useState<any[]>([]);
  const [filterDeck, setFilterDeck] = useState("");
  const [filterMode, setFilterMode] = useState("");
  const [filterSource, setFilterSource] = useState<"" | "imported" | "manual">("");
  const [filterPhase, setFilterPhase] = useState<PhaseFilter>("");
  const [filterResult, setFilterResult] = useState<"" | "Victoire" | "Défaite">("");
  const [filterTurnOrder, setFilterTurnOrder] = useState<"" | "Premier" | "Second">("");

  const formRef = useRef<HTMLDivElement>(null);
  const scrollToForm = useCallback(() => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    mode: "Simulateur",
    myDeck: MY_DECKS[0],
    opponentLeader: "",
    result: "Victoire",
    turnOrder: "",
    decisiveMoment: "",
    lossReason: "",
    cardsToWatch: "",
    notes: "",
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
    inspiredByDeckId: "",
    whatCouldHaveDoneDifferently: "",
    openingHandKeyCards: "",
    boardStateAtCritical: "",
    myLifeRemaining: "",
    decisionQuality: "",
    resultReading: "",
    deckId: "",
  });
  const [selectedMistakes, setSelectedMistakes] = useState<string[]>([]);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
  const [savedDecksForInspiration, setSavedDecksForInspiration] = useState<{ id: string; deckName: string; player: string }[]>([]);
  const [personalDecks, setPersonalDecks] = useState<{ id: string; name: string; leaderCardNumber: string }[]>([]);
  const [expandedMistakeCats, setExpandedMistakeCats] = useState<Set<string>>(new Set());
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [deletedToast, setDeletedToast] = useState<{ id: string; label: string } | null>(null);

  function toggleMistakeCat(key: string) {
    setExpandedMistakeCats((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }
  function toggleMistake(opt: string) {
    setSelectedMistakes((prev) => (prev.includes(opt) ? prev.filter((m) => m !== opt) : [...prev, opt]));
  }

  useEffect(() => {
    fetch("/api/tournament-decks?saved=true")
      .then((r) => r.json())
      .then((d) => setSavedDecksForInspiration(d.decks ?? []))
      .catch(() => {});
    fetch("/api/personal-decks")
      .then((r) => r.json())
      .then((d) => setPersonalDecks((d.decks ?? []).map((x: any) => ({ id: x.id, name: x.name, leaderCardNumber: x.leaderCardNumber }))))
      .catch(() => {});
  }, []);

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
    // Fusionne la sélection rapide et les cases cochées en détail — jamais
    // de doublon, mainMistake garde la 1ère pour la compatibilité avec les
    // anciennes statistiques (section 6).
    const allMistakes = Array.from(new Set([...selectedMistakes, ...(form.mainMistake ? [form.mainMistake] : [])]));
    const payload = {
      ...form,
      mainMistake: allMistakes[0] ?? null,
      mistakesJson: allMistakes.length ? JSON.stringify(allMistakes) : null,
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
      myLifeRemaining: toNum(form.myLifeRemaining),
    };
    const res = await fetch("/api/matches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const created = await res.json().catch(() => null);
    if (created?.ok && created.match?.result === "Défaite") {
      fetch(`/api/matches/${created.match.id}/analyze`, { method: "POST" }).catch(() => {});
    }
    setForm((f) => ({
      ...f,
      opponentLeader: "", cardsToWatch: "", notes: "", decisiveMoment: "", lossReason: "",
      turnOrder: "", mulligan: "", openingHandQuality: "", mainMistake: "", mostUsefulCard: "", uselessCard: "", keyTurn: "",
      confidence: "", donRecoveredUnused: "", cardsInHandEnd: "", opponentLifeRemaining: "", gameDurationMinutes: "",
      mihawkActivations: "", mihawkEffectForgotten: "", mihawkEffectTooEarly: "", firstCost5Turn: "",
      inspiredByDeckId: "", whatCouldHaveDoneDifferently: "", openingHandKeyCards: "", boardStateAtCritical: "", myLifeRemaining: "",
      decisionQuality: "", resultReading: "", deckId: "",
    }));
    setSelectedMistakes([]);
    setShowDetailedAnalysis(false);
    load();
    // Le widget d'en-tête et la zone "Entraînement du jour" ne se
    // remontent pas lors de cette mise à jour de state locale — on les
    // notifie explicitement pour qu'ils se rafraîchissent immédiatement.
    notifyMatchLogged();
  }

  async function deleteMatch(id: string) {
    const m = matches.find((x) => x.id === id);
    const label = m ? `du ${m.date} contre ${m.opponentLeader} (${m.result})` : "";
    if (!confirm(`Supprimer cette partie ${label} ? Tu pourras l'annuler juste après.`)) return;
    await fetch(`/api/matches/${id}`, { method: "DELETE" });
    setDeletedToast({ id, label });
    setTimeout(() => setDeletedToast((t) => (t?.id === id ? null : t)), 8000);
    load();
    notifyMatchLogged();
  }

  async function undoDelete() {
    if (!deletedToast) return;
    await fetch(`/api/matches/${deletedToast.id}/restore`, { method: "POST" });
    setDeletedToast(null);
    load();
    notifyMatchLogged();
  }

  function startEdit(m: any) {
    setEditingMatchId(m.id);
    setEditForm({
      date: m.date, mode: m.mode, myDeck: m.myDeck, opponentLeader: m.opponentLeader,
      result: m.result, trainingPhase: m.trainingPhase ?? "official_training",
    });
  }

  async function saveEdit(id: string) {
    await fetch(`/api/matches/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setEditingMatchId(null);
    setEditForm(null);
    load();
    notifyMatchLogged();
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
        notifyMatchLogged();
      }
    } catch (e: any) {
      setKaizokuResult({ parsed: 0, inserted: 0, skipped: 0, warnings: [e?.message ?? "Erreur inconnue."] });
    } finally {
      setKaizokuBusy(false);
    }
  }

  const visibleMatches = matches.filter((m) => {
    if (filterSource === "imported" && !m.kaizokuId) return false;
    if (filterSource === "manual" && m.kaizokuId) return false;
    if (filterPhase && (m.trainingPhase ?? "test") !== filterPhase) return false;
    if (filterResult && m.result !== filterResult) return false;
    if (filterTurnOrder && m.turnOrder !== filterTurnOrder) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <EntrainementDuJour onRegisterClick={scrollToForm} />

      <TrainingPriorityCard myDeck={filterDeck || undefined} />

      <div className="card-tile rounded-sm p-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setShowKaizoku((s) => !s)} className="flex items-center gap-3 text-left">
            <h3 className="font-mono text-xs uppercase tracking-widest text-gold">Importer depuis Card D. Kaizoku</h3>
            <span className="text-textMuted text-xs">{showKaizoku ? "Masquer ▲" : "Ouvrir ▼"}</span>
          </button>
          <a href={KAIZOKU_HISTORY_URL} target="_blank" rel="noreferrer" className="btn text-xs py-1.5 px-3 shrink-0">
            🔗 Voir mes matchs sur Kaizoku
          </a>
        </div>
        {showKaizoku && (
          <div className="mt-3 pt-3 border-t border-line space-y-3">
            <div className="text-xs text-steel/70">
              Va sur ta page d&rsquo;historique Kaizoku, sélectionne tout le tableau de matchs, colle-le ci-dessous. Les
              parties déjà importées sont automatiquement ignorées.
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
                <div>
                  {kaizokuResult.parsed} partie(s) reconnue(s) · <span className="text-emerald-bright">{kaizokuResult.inserted} ajoutée(s)</span> ·{" "}
                  {kaizokuResult.skipped} déjà connue(s) (ignorée(s))
                </div>
                {kaizokuResult.warnings.map((w, i) => (
                  <div key={i} className="text-gold">⚠ {w}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div ref={formRef} className="card-tile rounded-sm p-5">
        <h3 className="font-mono text-xs uppercase tracking-widest text-gold mb-3 border-b border-line pb-2">
          Enregistrer une partie <span className="text-steel/40 normal-case">— l&rsquo;essentiel en moins de 20 secondes</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
          <div>
            <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1">Mon deck</label>
            <select className="input w-full" value={form.myDeck} onChange={(e) => setForm((f) => ({ ...f, myDeck: e.target.value }))}>
              {MY_DECKS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1">Leader adverse</label>
            <div className="flex items-center gap-2">
              <input
                list="leaders"
                className="input w-full"
                placeholder="ex. Enel, Luffy Vert/Bleu..."
                value={form.opponentLeader}
                onChange={(e) => setForm((f) => ({ ...f, opponentLeader: e.target.value }))}
              />
              {form.opponentLeader && <OpponentLeaderBadge label={form.opponentLeader} size={28} />}
            </div>
            <datalist id="leaders">{opponentLeaders.map((l) => <option key={l} value={l} />)}</datalist>
          </div>
          <div>
            <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1">Premier / Second</label>
            <select className="input w-full" value={form.turnOrder} onChange={(e) => setForm((f) => ({ ...f, turnOrder: e.target.value }))}>
              <option value="">—</option>
              <option>Premier</option>
              <option>Second</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1">Date</label>
            <input type="date" className="input w-full" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1">Moment critique</label>
            <input
              className="input w-full"
              placeholder="ex. Board Xebec devenu plus fort que le mien au tour 5"
              value={form.decisiveMoment}
              onChange={(e) => setForm((f) => ({ ...f, decisiveMoment: e.target.value }))}
            />
          </div>
          {form.result === "Défaite" && (
            <div className="md:col-span-2">
              <label className="text-[11px] font-mono uppercase text-gold block mb-1">
                ✍️ Ma raison initiale <span className="text-steel/40 normal-case">— jamais modifiée automatiquement, sert de base à l&rsquo;analyse du coach</span>
              </label>
              <textarea
                className="input w-full"
                rows={2}
                placeholder="ex. J'ai attaqué la Life trop tôt et il a récupéré beaucoup de cartes..."
                value={form.lossReason}
                onChange={(e) => setForm((f) => ({ ...f, lossReason: e.target.value }))}
              />
            </div>
          )}
        </div>

        <button onClick={() => setShowDetailedAnalysis((s) => !s)} className="text-xs font-mono text-gold mt-3 flex items-center gap-1">
          {showDetailedAnalysis ? "▲ Masquer l'analyse détaillée" : "▼ Ajouter une analyse détaillée (facultatif)"}
        </button>

        {showDetailedAnalysis && (
          <div className="space-y-4 mt-3 pt-3 border-t border-line">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1">Mode</label>
                <select className="input w-full" value={form.mode} onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value }))}>
                  <option>Simulateur</option>
                  <option>Boutique</option>
                  <option>Amical</option>
                  <option>Tournoi</option>
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
                <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1">Tour approximatif de la défaite</label>
                <input className="input w-full" placeholder="ex. Tour 4" value={form.keyTurn} onChange={(e) => setForm((f) => ({ ...f, keyTurn: e.target.value }))} />
              </div>
              <div>
                <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1">Erreur principale</label>
                <select className="input w-full" value={form.mainMistake} onChange={(e) => setForm((f) => ({ ...f, mainMistake: e.target.value }))}>
                  <option value="">—</option>
                  {QUICK_MISTAKES.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1">Qualité de mes décisions</label>
                <select className="input w-full" value={form.decisionQuality} onChange={(e) => setForm((f) => ({ ...f, decisionQuality: e.target.value }))}>
                  <option value="">—</option>
                  <option>Très bonne</option>
                  <option>Correcte</option>
                  <option>Plusieurs erreurs</option>
                  <option>Erreur décisive</option>
                  <option>Je ne sais pas</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1">Lecture du résultat</label>
                <select className="input w-full" value={form.resultReading} onChange={(e) => setForm((f) => ({ ...f, resultReading: e.target.value }))}>
                  <option value="">—</option>
                  <option>Victoire logique</option>
                  <option>Défaite logique</option>
                  <option>Victoire malgré une erreur</option>
                  <option>Défaite malgré de bonnes décisions</option>
                  <option>Variance importante</option>
                  <option>Je ne sais pas</option>
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
              <div>
                <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1">Carte(s) à surveiller</label>
                <input className="input w-full" value={form.cardsToWatch} onChange={(e) => setForm((f) => ({ ...f, cardsToWatch: e.target.value }))} />
              </div>
              <div>
                <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1">Notes</label>
                <input className="input w-full" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>

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
              <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1.5">
                Catégories d&rsquo;erreurs <span className="text-steel/40 normal-case">(coche tout ce qui s&rsquo;applique)</span>
              </label>
              <div className="space-y-1.5">
                {MISTAKE_CATEGORIES.map((cat) => {
                  const checkedCount = cat.items.filter((opt) => selectedMistakes.includes(opt)).length;
                  const open = expandedMistakeCats.has(cat.key);
                  return (
                    <div key={cat.key} className="bg-panel2 rounded-lg p-2.5">
                      <button type="button" onClick={() => toggleMistakeCat(cat.key)} className="w-full flex items-center justify-between text-xs font-mono text-white">
                        <span>{open ? "▲" : "▼"} {cat.label}</span>
                        {checkedCount > 0 && <span className="text-emerald-bright">{checkedCount} sélectionnée(s)</span>}
                      </button>
                      {open && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {cat.items.map((opt) => (
                            <button key={opt} type="button" onClick={() => toggleMistake(opt)} className={`chip ${selectedMistakes.includes(opt) ? "chip-active" : ""}`}>
                              {selectedMistakes.includes(opt) ? "☑ " : "☐ "}{opt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {(() => {
                  const checkedCount = DECK_SPECIFIC_MISTAKES.filter((opt) => selectedMistakes.includes(opt)).length;
                  const open = expandedMistakeCats.has("deck_specific");
                  return (
                    <div className="bg-panel2 rounded-lg p-2.5">
                      <button type="button" onClick={() => toggleMistakeCat("deck_specific")} className="w-full flex items-center justify-between text-xs font-mono text-white">
                        <span>{open ? "▲" : "▼"} Spécifique à mon deck</span>
                        {checkedCount > 0 && <span className="text-emerald-bright">{checkedCount} sélectionnée(s)</span>}
                      </button>
                      {open && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {DECK_SPECIFIC_MISTAKES.map((opt) => (
                            <button key={opt} type="button" onClick={() => toggleMistake(opt)} className={`chip ${selectedMistakes.includes(opt) ? "chip-active" : ""}`}>
                              {selectedMistakes.includes(opt) ? "☑ " : "☐ "}{opt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
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
                <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1">Mes Life restantes</label>
                <input type="number" min={0} className="input w-full" value={form.myLifeRemaining} onChange={(e) => setForm((f) => ({ ...f, myLifeRemaining: e.target.value }))} />
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
              <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1">Cartes importantes dans ma main de départ</label>
              <input className="input w-full" placeholder="ex. OP14-023, OP14-020..." value={form.openingHandKeyCards} onChange={(e) => setForm((f) => ({ ...f, openingHandKeyCards: e.target.value }))} />
            </div>

            <div>
              <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1">État du board au moment critique</label>
              <textarea className="input w-full" rows={2} placeholder="ex. 3 personnages reposés en face, plus de Blocker de mon côté" value={form.boardStateAtCritical} onChange={(e) => setForm((f) => ({ ...f, boardStateAtCritical: e.target.value }))} />
            </div>

            <div>
              <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1">Ce que j&rsquo;aurais pu faire autrement</label>
              <textarea className="input w-full" rows={2} value={form.whatCouldHaveDoneDifferently} onChange={(e) => setForm((f) => ({ ...f, whatCouldHaveDoneDifferently: e.target.value }))} />
            </div>

            {savedDecksForInspiration.length > 0 && (
              <div>
                <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1">Inspiré par un deck gagnant sauvegardé (facultatif)</label>
                <select className="input w-full" value={form.inspiredByDeckId} onChange={(e) => setForm((f) => ({ ...f, inspiredByDeckId: e.target.value }))}>
                  <option value="">— Aucun —</option>
                  {savedDecksForInspiration.map((d) => (
                    <option key={d.id} value={d.id}>{d.deckName} — {d.player}</option>
                  ))}
                </select>
              </div>
            )}

            {personalDecks.length > 0 && (
              <div>
                <label className="text-[11px] font-mono uppercase text-steel/60 block mb-1">
                  Version de deck utilisée (Mes Decks) <span className="text-steel/40 normal-case">— facultatif, pour comparer tes stats par version (section 16)</span>
                </label>
                <select className="input w-full" value={form.deckId} onChange={(e) => setForm((f) => ({ ...f, deckId: e.target.value }))}>
                  <option value="">— Non lié —</option>
                  {personalDecks.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.leaderCardNumber})</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        <button onClick={addMatch} className="btn btn-primary mt-3 w-full sm:w-auto">Ajouter la partie</button>
      </div>

      <div className="card-tile rounded-sm p-5">
        <h3 className="font-mono text-xs uppercase tracking-widest text-gold mb-3 border-b border-line pb-2">Historique</h3>
        <div className="flex gap-2 mb-3 flex-wrap">
          <select className="input" value={filterDeck} onChange={(e) => setFilterDeck(e.target.value)}>
            <option value="">Tous mes decks</option>
            {MY_DECKS.map((d) => <option key={d}>{d}</option>)}
          </select>
          <select className="input" value={filterMode} onChange={(e) => setFilterMode(e.target.value)}>
            <option value="">Tous les modes</option>
            <option>Simulateur</option>
            <option>Boutique</option>
            <option>Amical</option>
            <option>Tournoi</option>
          </select>
          <select className="input" value={filterSource} onChange={(e) => setFilterSource(e.target.value as any)}>
            <option value="">Importées + écrites à la main</option>
            <option value="imported">Importées (Kaizoku) uniquement</option>
            <option value="manual">Écrites à la main uniquement</option>
          </select>
          <select className="input" value={filterPhase} onChange={(e) => setFilterPhase(e.target.value as PhaseFilter)}>
            <option value="">Toutes les phases</option>
            <option value="official_training">Entraînement officiel</option>
            <option value="test">Phase test</option>
          </select>
          <select className="input" value={filterResult} onChange={(e) => setFilterResult(e.target.value as any)}>
            <option value="">Victoires + défaites</option>
            <option value="Victoire">Victoires uniquement</option>
            <option value="Défaite">Défaites uniquement</option>
          </select>
          <select className="input" value={filterTurnOrder} onChange={(e) => setFilterTurnOrder(e.target.value as any)}>
            <option value="">Premier + second</option>
            <option value="Premier">Premier uniquement</option>
            <option value="Second">Second uniquement</option>
          </select>
        </div>

        {deletedToast && (
          <div className="mb-3 flex items-center justify-between gap-3 bg-panel2 border border-line rounded-lg px-3 py-2 text-xs">
            <span>Partie {deletedToast.label} supprimée.</span>
            <button onClick={undoDelete} className="text-emerald-bright hover:underline font-mono">↩ Annuler</button>
          </div>
        )}

        {visibleMatches.length === 0 ? (
          <div className="text-steel/60 text-sm font-mono">Aucune partie enregistrée pour ce filtre.</div>
        ) : (
          <>
            {/* Historique mobile : cartes empilées, pas de tableau large (section 19) */}
            <div className="sm:hidden space-y-2">
              {visibleMatches.map((m) => (
                <div key={m.id} className="bg-panel2 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-steel/70">{m.date}</span>
                    <span className={`badge ${m.result === "Victoire" ? "badge-green" : "badge-red"}`}>{m.result}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`badge ${m.myDeck.includes("Mihawk") ? "badge-green" : "badge-gold"} inline-flex items-center gap-1`}>
                      <LeaderImage leaderKey={m.myDeck.includes("Mihawk") ? "mihawk" : "shanks"} size={14} />
                      {m.myDeck.includes("Mihawk") ? "Mihawk" : "Shanks"}
                    </span>
                    <OpponentLeaderBadge label={m.opponentLeader} size={20} />
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-[10px]">
                    <span className={`badge ${(m.trainingPhase ?? "test") === "official_training" ? "badge-gold" : "badge-gray"}`}>
                      {(m.trainingPhase ?? "test") === "official_training" ? "Officiel" : "Test"}
                    </span>
                    {m.kaizokuId ? <span className="badge badge-gold">📥 Import</span> : <span className="badge">✎ Manuel</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-[11px] font-mono">
                    {m.result === "Défaite" && (
                      <button onClick={() => setExpandedMatchId((id) => (id === m.id ? null : m.id))} className="text-emerald-bright hover:underline">
                        {expandedMatchId === m.id ? "▲ Fermer" : "🧑‍🏫 Analyse"}
                      </button>
                    )}
                    <button onClick={() => startEdit(m)} className="text-steel/70 hover:text-ivory">✎ Modifier</button>
                    <button onClick={() => deleteMatch(m.id)} className="text-steel/60 hover:text-red-400">✕ Supprimer</button>
                  </div>
                  {editingMatchId === m.id && editForm && <EditMatchForm form={editForm} setForm={setEditForm} onSave={() => saveEdit(m.id)} onCancel={() => setEditingMatchId(null)} />}
                  {expandedMatchId === m.id && (
                    <div className="mt-2">
                      <MatchDefeatPanel matchId={m.id} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Historique desktop : tableau compact */}
            <div className="hidden sm:block table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] font-mono uppercase text-steel/60 border-b border-line">
                    <th className="text-left py-1">Date</th><th className="text-left">Mode</th><th className="text-left">Deck</th><th className="text-left">Adversaire</th>
                    <th className="text-left">Résultat</th><th className="text-left">Phase</th><th className="text-left">Source</th><th></th><th></th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleMatches.map((m) => (
                    <Fragment key={m.id}>
                      <tr className="border-b border-line/50">
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
                        <td className="text-[10px]">
                          <span className={`badge ${(m.trainingPhase ?? "test") === "official_training" ? "badge-gold" : "badge-gray"}`}>
                            {(m.trainingPhase ?? "test") === "official_training" ? "Officiel" : "Test"}
                          </span>
                        </td>
                        <td className="text-[10px]">
                          {m.kaizokuId ? <span className="badge badge-gold">📥 Import</span> : <span className="badge">✎ Manuel</span>}
                        </td>
                        <td>
                          {m.result === "Défaite" && (
                            <button onClick={() => setExpandedMatchId((id) => (id === m.id ? null : m.id))} className="text-[10px] font-mono text-emerald-bright hover:underline whitespace-nowrap">
                              {expandedMatchId === m.id ? "▲ Fermer" : "🧑‍🏫 Analyse"}
                            </button>
                          )}
                        </td>
                        <td><button onClick={() => startEdit(m)} className="text-[10px] font-mono text-steel/70 hover:text-ivory whitespace-nowrap">✎ Modifier</button></td>
                        <td><button onClick={() => deleteMatch(m.id)} className="text-steel/60 hover:text-red-400">✕</button></td>
                      </tr>
                      {editingMatchId === m.id && editForm && (
                        <tr className="border-b border-line/50">
                          <td colSpan={10} className="py-2">
                            <EditMatchForm form={editForm} setForm={setEditForm} onSave={() => saveEdit(m.id)} onCancel={() => setEditingMatchId(null)} />
                          </td>
                        </tr>
                      )}
                      {expandedMatchId === m.id && (
                        <tr className="border-b border-line/50">
                          <td colSpan={10} className="py-2">
                            <MatchDefeatPanel matchId={m.id} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="pt-2 border-t border-line">
        <h3 className="font-mono text-xs uppercase tracking-widest text-steel/50 mb-3">Suivi de progression</h3>
        <div className="space-y-6">
          <CoachBilanSection />
          <SkillScoresSection myDeck={filterDeck || undefined} />
          <MistakeTrendSection myDeck={filterDeck || undefined} />
          <MatchesOverview />
          <PersonalStatsSection />
        </div>
      </div>
    </div>
  );
}

// Formulaire d'édition minimal (section 18) — corrige les champs les plus
// souvent faux après coup (deck, adversaire, résultat, date, phase).
// L'édition détaillée (analyse, erreurs...) reste dans le panneau d'analyse
// du coach (MatchDefeatPanel), pour ne pas dupliquer ce formulaire.
function EditMatchForm({ form, setForm, onSave, onCancel }: { form: any; setForm: (f: any) => void; onSave: () => void; onCancel: () => void }) {
  return (
    <div className="bg-panel2 rounded-lg p-3 space-y-2">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] font-mono uppercase text-steel/60 block mb-1">Date</label>
          <input type="date" className="input w-full text-xs" value={form.date} onChange={(e) => setForm((f: any) => ({ ...f, date: e.target.value }))} />
        </div>
        <div>
          <label className="text-[10px] font-mono uppercase text-steel/60 block mb-1">Mode</label>
          <select className="input w-full text-xs" value={form.mode} onChange={(e) => setForm((f: any) => ({ ...f, mode: e.target.value }))}>
            <option>Simulateur</option><option>Boutique</option><option>Amical</option><option>Tournoi</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] font-mono uppercase text-steel/60 block mb-1">Mon deck</label>
          <select className="input w-full text-xs" value={form.myDeck} onChange={(e) => setForm((f: any) => ({ ...f, myDeck: e.target.value }))}>
            {MY_DECKS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-[10px] font-mono uppercase text-steel/60 block mb-1">Leader adverse</label>
          <input className="input w-full text-xs" value={form.opponentLeader} onChange={(e) => setForm((f: any) => ({ ...f, opponentLeader: e.target.value }))} />
        </div>
        <div>
          <label className="text-[10px] font-mono uppercase text-steel/60 block mb-1">Résultat</label>
          <select className="input w-full text-xs" value={form.result} onChange={(e) => setForm((f: any) => ({ ...f, result: e.target.value }))}>
            <option>Victoire</option><option>Défaite</option>
          </select>
        </div>
        <div className="col-span-2 md:col-span-3">
          <label className="text-[10px] font-mono uppercase text-steel/60 block mb-1">
            Phase <span className="text-steel/40 normal-case">(corrige une erreur de classement test / officiel)</span>
          </label>
          <select className="input w-full text-xs" value={form.trainingPhase} onChange={(e) => setForm((f: any) => ({ ...f, trainingPhase: e.target.value }))}>
            <option value="official_training">Entraînement officiel</option>
            <option value="test">Phase test</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onSave} className="btn btn-primary text-xs py-1.5 px-3">Enregistrer</button>
        <button onClick={onCancel} className="btn text-xs py-1.5 px-3">Annuler</button>
      </div>
    </div>
  );
}
