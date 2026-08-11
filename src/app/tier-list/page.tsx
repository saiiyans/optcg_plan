"use client";
import { useEffect, useState } from "react";
import { CardThumb } from "@/components/CardThumb";
import { OPPONENT_LEADERS } from "@/lib/planningData";

const TIERS = ["S", "A", "B", "C", "D"] as const;
const TIER_COLORS: Record<string, string> = {
  S: "border-gold bg-gold/10 text-gold",
  A: "border-emerald bg-emerald-dim text-emerald-bright",
  B: "border-line bg-panel2 text-white",
  C: "border-line bg-panel2 text-steel/80",
  D: "border-line bg-panel2 text-steel/60",
};

export default function TierListPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState(false);
  const [autoResult, setAutoResult] = useState<any>(null);
  const [addCardNumber, setAddCardNumber] = useState("");
  const [addName, setAddName] = useState("");

  const load = () => {
    setState("loading");
    fetch("/api/tier-list")
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) throw new Error();
        setEntries(d.entries ?? []);
        setState("ready");
      })
      .catch(() => setState("error"));
  };

  useEffect(load, []);

  async function moveTier(cardNumber: string, displayName: string, color: string | null, tier: string) {
    await fetch("/api/tier-list", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardNumber, tier, displayName, color }),
    });
    load();
  }

  async function removeEntry(cardNumber: string) {
    if (!confirm("Retirer ce leader de la tier list ?")) return;
    await fetch(`/api/tier-list?cardNumber=${encodeURIComponent(cardNumber)}`, { method: "DELETE" });
    load();
  }

  async function addLeader() {
    if (!addCardNumber.trim() || !addName.trim()) return;
    await moveTier(addCardNumber.trim().toUpperCase(), addName.trim(), null, "C");
    setAddCardNumber("");
    setAddName("");
  }

  async function autoClassify() {
    if (!confirm("Classer automatiquement selon les données onepiecetopdecks.com ? Les leaders déjà corrigés à la main ne seront jamais touchés.")) return;
    setBusy(true);
    const res = await fetch("/api/tier-list/auto-classify", { method: "POST" });
    const data = await res.json();
    setAutoResult(data);
    setBusy(false);
    load();
  }

  const byTier: Record<string, any[]> = { S: [], A: [], B: [], C: [], D: [] };
  for (const e of entries) (byTier[e.tier] ?? byTier.D).push(e);

  return (
    <div className="space-y-6">
      <div className="card-tile p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
          <h1 className="text-[28px] sm:text-3xl font-display font-bold text-white">Tier List de la méta</h1>
          <button onClick={autoClassify} disabled={busy} className="btn btn-primary">
            {busy ? "Classement..." : "🔄 Classer automatiquement (onepiecetopdecks.com)"}
          </button>
        </div>
        <p className="text-xs text-steel/60">
          onepiecetopdecks.com n'a pas de page "tier list" officielle — c'est une base de decklists de tournois. Le classement automatique est calculé à partir de la <strong>fréquence de soumission des decklists</strong> (plus un leader revient souvent dans les résultats de tournois, plus haut il est classé), pas un jugement du site. Déplace librement n'importe quel leader à la main — une correction manuelle n'est jamais écrasée par un nouveau classement automatique.
        </p>
        {autoResult && (
          <div className="text-xs font-mono text-emerald-bright mt-2">
            {autoResult.applied} leader(s) classé(s), {autoResult.skippedManual} déjà corrigé(s) à la main donc ignoré(s) — instantané du {autoResult.capturedAt} ({autoResult.format}).
          </div>
        )}
      </div>

      <div className="card-tile p-4">
        <div className="text-[11px] font-mono uppercase text-steel/60 mb-2">Ajouter un leader à la tier list</div>
        <div className="flex flex-wrap gap-2">
          <input list="leader-suggestions" className="input flex-1 min-w-[180px]" placeholder="Nom du leader" value={addName} onChange={(e) => setAddName(e.target.value)} />
          <datalist id="leader-suggestions">
            {OPPONENT_LEADERS.map((l) => <option key={l} value={l} />)}
          </datalist>
          <input className="input w-40" placeholder="Numéro (ex. OP16-080)" value={addCardNumber} onChange={(e) => setAddCardNumber(e.target.value)} />
          <button onClick={addLeader} className="btn">+ Ajouter (tier C par défaut)</button>
        </div>
      </div>

      {state === "loading" && <div className="card-tile p-5"><div className="skeleton h-40" /></div>}
      {state === "error" && <div className="card-tile p-5 text-xs text-danger">Impossible de charger la tier list.</div>}

      {state === "ready" && TIERS.map((tier) => (
        <div key={tier} className={`card-tile p-5 border-2 ${TIER_COLORS[tier]}`}>
          <h2 className="font-mono text-lg font-bold mb-3">Tier {tier}</h2>
          {byTier[tier].length === 0 ? (
            <div className="text-xs text-steel/50">Aucun leader dans ce tier.</div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {byTier[tier].map((e) => (
                <div key={e.cardNumber} className="bg-panel2 rounded-lg p-2.5 flex flex-col items-center gap-1.5" style={{ minWidth: 90 }}>
                  <CardThumb cardNumber={e.cardNumber} size={56} showLabel={false} />
                  <div className="text-[10px] text-center text-white leading-tight">{e.displayName}</div>
                  {e.tierSource === "manual" && <span className="text-[8px] text-gold">✎ manuel</span>}
                  <div className="flex gap-1 flex-wrap justify-center">
                    {TIERS.filter((t) => t !== tier).map((t) => (
                      <button
                        key={t}
                        onClick={() => moveTier(e.cardNumber, e.displayName, e.color, t)}
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-ink border border-line hover:border-emerald text-steel/70 hover:text-emerald-bright"
                      >
                        →{t}
                      </button>
                    ))}
                    <button onClick={() => removeEntry(e.cardNumber)} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-ink border border-line hover:border-red-500 text-steel/70 hover:text-red-400">
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
