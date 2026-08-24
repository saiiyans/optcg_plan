"use client";
import { useEffect, useState, useCallback } from "react";
import { OpponentLeaderBadge } from "@/components/OpponentLeaderBadge";

// --- /leaders (section 11) — outil de normalisation des leaders adverses.
// Affiche chaque fiche canonique avec ses variantes de texte brut connues,
// suggère des paires probablement identiques (jamais fusionnées seules),
// et permet de fusionner manuellement ou de renseigner l'identifiant
// canonique basé sur le numéro de carte (ex. "OP17-039 — Rocks.D.Xebec").

interface Leader {
  id: string;
  displayName: string;
  cardNumber: string | null;
  color: string | null;
  rawNames: string[];
  matchCount: number;
}
interface Suggestion {
  aId: string;
  bId: string;
  reason: string;
}

export default function LeadersPage() {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [backfillResult, setBackfillResult] = useState<{ total: number; updated: number } | null>(null);
  const [backfillBusy, setBackfillBusy] = useState(false);
  const [editCardNumber, setEditCardNumber] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/opponent-leaders");
    const data = await res.json();
    if (data.ok) {
      setLeaders(data.leaders);
      setSuggestions(data.suggestions);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function merge(sourceId: string, targetId: string) {
    setBusyId(sourceId);
    await fetch("/api/opponent-leaders/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId, targetId }),
    });
    setBusyId(null);
    load();
  }

  async function saveCardNumber(id: string) {
    const cardNumber = editCardNumber[id] ?? "";
    await fetch(`/api/opponent-leaders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardNumber: cardNumber || null }),
    });
    load();
  }

  async function runBackfill() {
    setBackfillBusy(true);
    const res = await fetch("/api/admin/backfill-opponent-leaders", { method: "POST" });
    const data = await res.json();
    setBackfillResult({ total: data.total ?? 0, updated: data.updated ?? 0 });
    setBackfillBusy(false);
    load();
  }

  const byId = new Map(leaders.map((l) => [l.id, l]));

  return (
    <div className="space-y-6">
      <div className="card-tile rounded-sm p-4">
        <div className="text-[11px] font-mono uppercase tracking-widest text-gold">Leaders adverses</div>
        <div className="text-white text-sm mt-1">
          Une fiche par leader canonique, quelle que soit la façon dont il a été saisi. Fusionne les doublons, renseigne
          l&rsquo;identifiant canonique (numéro de carte) — rien n&rsquo;est jamais fusionné automatiquement.
        </div>
      </div>

      <div className="card-tile rounded-sm p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="text-xs text-steel/70">
          Relie les anciennes parties qui n&rsquo;ont pas encore de leader normalisé (avant l&rsquo;introduction de cette fonctionnalité).
        </div>
        <button onClick={runBackfill} disabled={backfillBusy} className="btn">
          {backfillBusy ? "En cours..." : "Résoudre les parties non normalisées"}
        </button>
      </div>
      {backfillResult && (
        <div className="text-xs font-mono text-emerald-bright -mt-3">
          {backfillResult.updated} partie(s) mise(s) à jour sur {backfillResult.total} en attente.
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="card-tile rounded-sm p-5 border-gold/40">
          <h3 className="font-mono text-xs uppercase tracking-widest text-gold mb-3 border-b border-line pb-2">
            À vérifier — probablement le même leader
          </h3>
          <div className="space-y-3">
            {suggestions.map((s) => {
              const a = byId.get(s.aId);
              const b = byId.get(s.bId);
              if (!a || !b) return null;
              return (
                <div key={`${s.aId}-${s.bId}`} className="bg-panel2 rounded-lg p-3">
                  <div className="text-[11px] text-steel/60 mb-2">{s.reason}</div>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="text-sm text-white">{a.displayName} <span className="text-steel/50 font-mono text-xs">({a.matchCount} partie{a.matchCount > 1 ? "s" : ""})</span></div>
                        <div className="text-[10px] text-steel/50">{a.rawNames.join(", ")}</div>
                      </div>
                      <span className="text-steel/40">↔</span>
                      <div>
                        <div className="text-sm text-white">{b.displayName} <span className="text-steel/50 font-mono text-xs">({b.matchCount} partie{b.matchCount > 1 ? "s" : ""})</span></div>
                        <div className="text-[10px] text-steel/50">{b.rawNames.join(", ")}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button disabled={busyId === a.id} onClick={() => merge(a.id, b.id)} className="btn text-xs py-1.5 px-3">
                        Fusionner dans « {b.displayName} »
                      </button>
                      <button disabled={busyId === b.id} onClick={() => merge(b.id, a.id)} className="btn text-xs py-1.5 px-3">
                        Fusionner dans « {a.displayName} »
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="card-tile rounded-sm p-5">
        <h3 className="font-mono text-xs uppercase tracking-widest text-gold mb-3 border-b border-line pb-2">
          Toutes les fiches ({leaders.length})
        </h3>
        {loading ? (
          <div className="skeleton h-20" />
        ) : (
          <div className="space-y-2">
            {leaders.map((l) => (
              <div key={l.id} className="bg-panel2 rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <OpponentLeaderBadge label={l.cardNumber ? `${l.displayName} (${l.cardNumber})` : l.displayName} size={26} />
                  <div className="min-w-0">
                    <div className="text-sm text-white">
                      {l.cardNumber ? `${l.cardNumber} — ${l.displayName}` : l.displayName}
                    </div>
                    <div className="text-[10px] text-steel/50 truncate">{l.rawNames.join(", ")}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-mono text-steel/60">{l.matchCount} partie{l.matchCount > 1 ? "s" : ""}</span>
                  <input
                    className="input text-xs py-1.5 w-28"
                    placeholder="OP17-039"
                    value={editCardNumber[l.id] ?? l.cardNumber ?? ""}
                    onChange={(e) => setEditCardNumber((prev) => ({ ...prev, [l.id]: e.target.value }))}
                  />
                  <button onClick={() => saveCardNumber(l.id)} className="btn text-xs py-1.5 px-3">Enregistrer</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
