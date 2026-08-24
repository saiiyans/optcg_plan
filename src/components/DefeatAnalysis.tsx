"use client";

import { useEffect, useState } from "react";
import { TECHNICAL_TERMS, type TechnicalTermKey } from "@/lib/defeatAnalysis";
import { DataInsufficient } from "@/components/PerformanceStats";

/**
 * Composants du Journal — "Analyse du coach" par défaite (section 5 du
 * cahier des charges), "Ta priorité actuelle" (section 8) et "Évolution
 * des erreurs dans le temps" (section 7). Toute la logique de décision
 * vit dans src/lib/defeatAnalysis.ts (déterministe, sans IA externe) ;
 * ces composants ne font qu'afficher ce que l'API renvoie.
 */

function confidenceBadgeClass(level?: string) {
  if (level === "Élevé") return "badge-green";
  if (level === "Moyen") return "badge-gold";
  return "badge";
}

function TechnicalTermBadge({ term }: { term: string | null }) {
  if (!term || !(term in TECHNICAL_TERMS)) return null;
  const info = TECHNICAL_TERMS[term as TechnicalTermKey];
  return (
    <div className="bg-panel2 rounded-lg p-2.5 text-xs">
      <span className="text-gold font-mono uppercase text-[10px] tracking-wider">Terme technique — {info.label}</span>
      <p className="text-steel/80 mt-1">{info.definitionFr}</p>
    </div>
  );
}

/** Carte "Ta priorité actuelle" — section 8, en haut du Journal. */
export function TrainingPriorityCard({ myDeck }: { myDeck?: string }) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const params = myDeck ? `?myDeck=${encodeURIComponent(myDeck)}` : "";
    fetch(`/api/coach/journal-summary${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) throw new Error();
        setData(d);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, [myDeck]);

  if (state === "loading") return <div className="card-tile rounded-sm p-5 border-emerald/40"><div className="skeleton h-16" /></div>;
  if (state === "error" || !data) return null;

  const prio = data.trainingPriority;

  return (
    <div className="card-tile rounded-sm p-5 border-emerald/40">
      <h3 className="font-mono text-xs uppercase tracking-widest text-gold mb-2 border-b border-line pb-2">🎯 Ta priorité actuelle</h3>
      {!prio?.hasData ? (
        <DataInsufficient reason={prio?.reason} />
      ) : (
        <div className="space-y-2">
          <div className="text-white text-lg font-display">{prio.priority}</div>
          <p className="text-sm text-steel/80">{prio.why}</p>
          <div className="pt-2 border-t border-line mt-2 text-emerald-bright text-sm">🏋️ Mission (3 prochaines parties) : {prio.mission}</div>
        </div>
      )}
    </div>
  );
}

/** "Évolution des erreurs dans le temps" — section 7. */
export function MistakeTrendSection({ myDeck }: { myDeck?: string }) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const params = myDeck ? `?myDeck=${encodeURIComponent(myDeck)}` : "";
    fetch(`/api/coach/journal-summary${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) throw new Error();
        setData(d);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, [myDeck]);

  if (state === "loading") return <div className="card-tile rounded-sm p-5"><div className="skeleton h-16" /></div>;
  if (state === "error" || !data) return null;

  const trend = data.mistakeTrend;

  return (
    <div className="card-tile rounded-sm p-5">
      <h3 className="font-mono text-xs uppercase tracking-widest text-gold mb-3 border-b border-line pb-2">Évolution des erreurs dans le temps</h3>
      {!trend?.hasData ? (
        <DataInsufficient reason={trend?.reason} />
      ) : (
        <div className="space-y-1.5">
          {trend.entries.map((e: any) => (
            <div key={e.mistake} className="flex items-center justify-between text-sm gap-2">
              <span className="text-steel/80 min-w-0 truncate">{e.mistake}</span>
              <span className="font-mono text-xs shrink-0 flex items-center gap-1">
                <span className="text-steel/50">{e.previousCount} → </span>
                <span className={e.direction === "up" ? "text-red-400" : e.direction === "down" ? "text-emerald-bright" : "text-steel/60"}>
                  {e.recentCount} {e.direction === "up" ? "↑" : e.direction === "down" ? "↓" : "→"}
                </span>
              </span>
            </div>
          ))}
          <div className="text-[10px] text-steel/50 pt-2 border-t border-line mt-2">
            Comparaison entre tes dernières parties taguées et les précédentes — ↑ = plus fréquente récemment, ↓ = en recul.
          </div>
        </div>
      )}
    </div>
  );
}

const SKILL_STATUS_STYLE: Record<string, string> = {
  "en progression": "text-emerald-bright",
  "stable": "text-steel/60",
  "en baisse": "text-red-400",
  "priorité actuelle": "text-gold",
};

/** Scores de compétence — section 14 : 6 indicateurs directement issus des
 * classifications de l'analyse du coach, jamais du seul winrate. */
export function SkillScoresSection({ myDeck }: { myDeck?: string }) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const params = myDeck ? `?myDeck=${encodeURIComponent(myDeck)}` : "";
    fetch(`/api/coach/journal-summary${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) throw new Error();
        setData(d);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, [myDeck]);

  if (state === "loading") return <div className="card-tile rounded-sm p-5"><div className="skeleton h-16" /></div>;
  if (state === "error" || !data) return null;

  const scores = data.skillScores;

  return (
    <div className="card-tile rounded-sm p-5">
      <h3 className="font-mono text-xs uppercase tracking-widest text-gold mb-3 border-b border-line pb-2">Scores de compétence</h3>
      {!scores?.hasData ? (
        <DataInsufficient reason={scores?.reason} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {scores.entries.map((e: any) => (
            <div key={e.skill} className="bg-panel2 rounded-lg p-3">
              <div className="text-xs text-white">{e.skill}</div>
              <div className={`text-[11px] font-mono mt-1 ${SKILL_STATUS_STYLE[e.status] ?? "text-steel/60"}`}>{e.status}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type EditableTextFieldProps = {
  label: string;
  value: string;
  placeholder?: string;
  rows?: number;
  onSave: (value: string) => Promise<void>;
};

function EditableTextField({ label, value, placeholder, rows = 2, onSave }: EditableTextFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraft(value), [value]);

  if (!editing) {
    return (
      <div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase text-steel/60">{label}</span>
          <button onClick={() => setEditing(true)} className="text-[10px] font-mono text-emerald-bright hover:underline">
            {value ? "✎ Modifier" : "+ Ajouter"}
          </button>
        </div>
        <p className={`text-sm mt-1 ${value ? "text-white" : "text-steel/50 italic"}`}>{value || placeholder || "Non renseigné."}</p>
      </div>
    );
  }

  return (
    <div>
      <span className="text-[11px] font-mono uppercase text-steel/60 block mb-1">{label}</span>
      <textarea className="input w-full" rows={rows} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
      <div className="flex gap-2 mt-1.5">
        <button
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            await onSave(draft);
            setSaving(false);
            setEditing(false);
          }}
          className="btn btn-primary text-xs py-1 px-2.5"
        >
          {saving ? "Sauvegarde..." : "Enregistrer"}
        </button>
        <button onClick={() => { setDraft(value); setEditing(false); }} className="btn text-xs py-1 px-2.5">
          Annuler
        </button>
      </div>
    </div>
  );
}

/**
 * Panneau d'analyse d'une défaite — déplié dans l'historique du Journal.
 * "Ma raison initiale" (jamais touchée par l'IA) + "Analyse du coach"
 * (régénérable, historique conservé). Voir cahier des charges section 1
 * et 5.
 */
export function MatchDefeatPanel({ matchId }: { matchId: string }) {
  const [match, setMatch] = useState<any>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [generating, setGenerating] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showMoreFields, setShowMoreFields] = useState(false);

  const load = async () => {
    try {
      const res = await fetch(`/api/matches/${matchId}`);
      const data = await res.json();
      if (!data.ok) throw new Error();
      setMatch(data.match);
      setState("ready");
    } catch {
      setState("error");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  async function patchMatch(fields: Record<string, unknown>) {
    await fetch(`/api/matches/${matchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    await load();
  }

  async function regenerate() {
    setGenerating(true);
    try {
      await fetch(`/api/matches/${matchId}/analyze`, { method: "POST" });
      await load();
    } finally {
      setGenerating(false);
    }
  }

  if (state === "loading") return <div className="bg-panel2 rounded-lg p-4"><div className="skeleton h-16" /></div>;
  if (state === "error" || !match) return <div className="bg-panel2 rounded-lg p-4 text-xs text-danger">Impossible de charger cette partie.</div>;

  const insights: any[] = match.insights ?? [];
  const latest = insights[0] ?? null;
  const olderInsights = insights.slice(1);
  const secondaryCauses: string[] = latest?.secondaryCauses ? JSON.parse(latest.secondaryCauses) : [];
  const missingQuestions: string[] = latest?.missingInfoQuestions ? JSON.parse(latest.missingInfoQuestions) : [];
  const classificationSecondary: string[] = latest?.classificationSecondary ? JSON.parse(latest.classificationSecondary) : [];

  return (
    <div className="bg-panel2 rounded-lg p-4 space-y-4">
      {/* --- Ma raison initiale — jamais écrasée par l'IA, éditable à la main --- */}
      <div className="bg-ink/40 rounded-lg p-3 border border-line">
        <EditableTextField
          label="✍️ Ma raison initiale"
          value={match.lossReason ?? ""}
          placeholder="Pourquoi penses-tu avoir perdu cette partie ? (jamais modifié automatiquement)"
          onSave={(v) => patchMatch({ lossReason: v })}
        />
      </div>

      {/* --- Analyse du coach --- */}
      <div>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <h4 className="font-mono text-xs uppercase tracking-widest text-gold">🧑‍🏫 Analyse du coach</h4>
          <button onClick={regenerate} disabled={generating} className="btn text-[10px] py-1 px-2">
            {generating ? "Analyse en cours..." : latest ? "🔄 Régénérer l'analyse" : "Générer l'analyse"}
          </button>
        </div>

        {!latest ? (
          <p className="text-xs font-mono text-steel/60">Pas encore d'analyse pour cette partie — clique sur "Générer l'analyse".</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`badge ${confidenceBadgeClass(latest.confidenceLevel)}`}>Confiance : {latest.confidenceLevel}</span>
              <span className="badge">{latest.classification}</span>
              {classificationSecondary.map((c: string) => (
                <span key={c} className="badge text-steel/70">{c}</span>
              ))}
            </div>

            <div>
              <div className="text-[11px] font-mono uppercase text-steel/60 mb-0.5">Cause principale</div>
              <p className="text-sm text-white leading-relaxed">{latest.mainCause}</p>
            </div>

            <TechnicalTermBadge term={latest.technicalTerm} />

            <div>
              <div className="text-[11px] font-mono uppercase text-steel/60 mb-0.5">Moment critique</div>
              <p className="text-sm text-steel/90">{latest.criticalMoment}</p>
            </div>

            <div>
              <div className="text-[11px] font-mono uppercase text-steel/60 mb-0.5">
                Meilleure ligne possible {latest.bestLineIsHypothesis && <span className="badge badge-gold text-[9px] ml-1">Hypothèse</span>}
              </div>
              <p className="text-sm text-steel/90">{latest.bestLine}</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <div className="text-[11px] font-mono uppercase text-emerald-bright mb-0.5">Leçon à retenir</div>
                <p className="text-sm text-steel/90">{latest.lessonFr}</p>
              </div>
              <div>
                <div className="text-[11px] font-mono uppercase text-emerald-bright mb-0.5">Exercice — 3 prochaines parties</div>
                <p className="text-sm text-steel/90">{latest.exerciseNext}</p>
              </div>
            </div>

            <button onClick={() => setShowDetails((s) => !s)} className="text-xs font-mono text-emerald-bright flex items-center gap-1">
              {showDetails ? "▲ Masquer les détails" : "▼ Détails supplémentaires"}
            </button>

            {showDetails && (
              <div className="space-y-3 pt-2 border-t border-line">
                {secondaryCauses.length > 0 && (
                  <div>
                    <div className="text-[11px] font-mono uppercase text-steel/60 mb-1">Raisons secondaires</div>
                    <ul className="space-y-0.5">
                      {secondaryCauses.map((s, i) => <li key={i} className="text-xs text-steel/80">• {s}</li>)}
                    </ul>
                  </div>
                )}

                {missingQuestions.length > 0 && (
                  <div>
                    <div className="text-[11px] font-mono uppercase text-steel/60 mb-1">Informations manquantes</div>
                    <ul className="space-y-0.5">
                      {missingQuestions.map((q, i) => <li key={i} className="text-xs text-steel/80">❓ {q}</li>)}
                    </ul>
                  </div>
                )}

                {olderInsights.length > 0 && (
                  <div>
                    <button onClick={() => setShowHistory((s) => !s)} className="text-[10px] font-mono text-steel/60 hover:text-white">
                      {showHistory ? "▲ Masquer" : "▼"} {olderInsights.length} analyse(s) précédente(s)
                    </button>
                    {showHistory && (
                      <ul className="space-y-1.5 mt-2">
                        {olderInsights.map((h: any) => (
                          <li key={h.id} className="text-xs text-steel/60 bg-ink/30 rounded p-2">
                            <span className="font-mono text-steel/40">{new Date(h.createdAt).toLocaleString("fr-FR")}</span> — {h.classification} : {h.mainCause}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- Compléter les infos de cette partie (facultatif) --- */}
      <div className="pt-2 border-t border-line">
        <button onClick={() => setShowMoreFields((s) => !s)} className="text-xs font-mono text-steel/60 hover:text-white flex items-center gap-1">
          {showMoreFields ? "▲ Masquer les infos complémentaires" : "▼ Compléter les infos de cette partie (améliore l'analyse)"}
        </button>
        {showMoreFields && (
          <div className="space-y-3 mt-3">
            <EditableTextField
              label="État du board au moment critique"
              value={match.boardStateAtCritical ?? ""}
              placeholder="Non renseigné."
              onSave={(v) => patchMatch({ boardStateAtCritical: v })}
            />
            <EditableTextField
              label="Cartes importantes dans ma main de départ"
              value={match.openingHandKeyCards ?? ""}
              placeholder="Non renseigné."
              onSave={(v) => patchMatch({ openingHandKeyCards: v })}
            />
            <EditableTextField
              label="Ce que j'aurais pu faire autrement"
              value={match.whatCouldHaveDoneDifferently ?? ""}
              placeholder="Non renseigné."
              onSave={(v) => patchMatch({ whatCouldHaveDoneDifferently: v })}
            />
          </div>
        )}
      </div>
    </div>
  );
}
