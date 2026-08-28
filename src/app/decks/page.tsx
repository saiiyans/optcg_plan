"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { LEADERS } from "@/lib/leaders";
import { LeaderImage } from "@/components/LeaderImage";

export default function WinningDecksPage() {
  const [leaderKey, setLeaderKey] = useState<string>("mihawk");
  const [decks, setDecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ status: "", undefeated: false, country: "", player: "" });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [test3Result, setTest3Result] = useState<any>(null);
  const [syncResult, setSyncResult] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("leader", leaderKey);
    if (filters.status) params.set("status", filters.status);
    if (filters.undefeated) params.set("undefeated", "true");
    if (filters.country) params.set("country", filters.country);
    if (filters.player) params.set("player", filters.player);
    const res = await fetch(`/api/tournament-decks?${params.toString()}`);
    const data = await res.json();
    setDecks(data.decks ?? []);
    setLoading(false);
  }, [filters, leaderKey]);

  useEffect(() => {
    load();
  }, [load]);

  async function runTest3() {
    setBusy(true);
    setStatus("Test sur 3 decklists Mihawk réelles...");
    const res = await fetch("/api/tournament-decks/test3");
    const data = await res.json();
    setTest3Result(data);
    setStatus(data.ok ? "Test terminé." : `Erreur : ${data.error}`);
    setBusy(false);
  }

  async function runSync() {
    setBusy(true);
    setStatus("Recherche de nouveaux résultats OP17...");
    const res = await fetch("/api/tournament-decks/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const data = await res.json();
    setSyncResult(data);
    setStatus(data.ok ? `${data.newDecksDetected} nouveau(x) deck(s) détecté(s).` : `Erreur : ${data.error}`);
    setBusy(false);
  }

  async function runImport() {
    if (!confirm("Importer toutes les decklists Mihawk (op14mihawk) trouvées sur la page OP17 ?")) return;
    setBusy(true);
    setStatus("Import en cours...");
    const res = await fetch("/api/tournament-decks/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: true }),
    });
    const data = await res.json();
    setStatus(data.ok ? `${data.created} deck(s) importé(s), ${data.skippedDuplicate} déjà en base.` : `Erreur : ${data.error}`);
    setBusy(false);
    load();
  }

  return (
    <div className="space-y-6">
      {/* EN-TÊTE (refonte — style Nakama Companion, cohérent avec
          Cartes/Matchups/Tier List) */}
      <div className="pt-1 pb-1">
        <span className="eyebrow-flame">✦ One Piece TCG · Decks</span>
        <h1 className="mt-1.5 text-3xl sm:text-4xl font-extrabold tracking-tight text-ivory leading-[1.05]">
          Decks <span className="text-flame-gradient italic">gagnants.</span>
        </h1>
        <p className="text-sm text-steel/70 mt-2 max-w-xl">Decklists de tournoi importées, filtrables par leader et par joueur.</p>
      </div>

      <div className="flex gap-2">
        {LEADERS.map((l) => (
          <button
            key={l.key}
            onClick={() => setLeaderKey(l.key)}
            className={`${leaderKey === l.key ? "btn btn-primary" : "btn"} flex items-center gap-2`}
          >
            <LeaderImage leaderKey={l.key} size={22} />
            {l.label}
          </button>
        ))}
      </div>

      <section className="card-tile p-5">
          <h2 className="font-mono text-xs uppercase tracking-widest text-gold mb-3 border-b border-line pb-2">
            Winning Mihawk Decks — import depuis onepiecetopdecks.com (OP17)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
            <button onClick={runTest3} disabled={busy} className="btn">1. Tester sur 3 decklists</button>
            <button onClick={runImport} disabled={busy} className="btn btn-primary">2. Importer (confirmation requise)</button>
            <button onClick={runSync} disabled={busy} className="btn">Mettre à jour les résultats OP17</button>
          </div>
          {status && <div className="text-xs text-steel/80 font-mono">{status}</div>}

          {test3Result && (
            <div className="mt-3 space-y-2">
              <div className="text-xs font-mono text-steel/70">
                {test3Result.totalMihawkRowsFound} decklist(s) Mihawk trouvée(s) au total sur la page — {test3Result.sample?.length} testée(s) ici.
              </div>
              {test3Result.sample?.map((d: any, i: number) => (
                <div key={i} className="bg-panel2 p-3 rounded text-xs font-mono">
                  <div className="text-white">{d.deckName} — {d.player} ({d.country}) — {d.date}</div>
                  <div className="text-steel/70">Placement : {d.placementRaw} · {d.tournamentType} · {d.host}</div>
                  <div className={d.parseValid ? "text-emerald-bright" : "text-red-400"}>
                    {d.cardCountNonLeader} cartes hors Leader — {d.parseValid ? "✓ Liste valide (50 cartes)" : `⚠ ${d.parseErrors.join("; ")}`}
                  </div>
                  <div className="text-steel/60">Statut : {d.placement.status} {d.placement.undefeated ? "· Invaincu" : ""} {d.placement.proofLevel ? `· Preuve: ${d.placement.proofLevel}` : ""}</div>
                </div>
              ))}
            </div>
          )}

          {syncResult && (
            <div className="mt-3 text-xs font-mono bg-panel2 p-3 rounded">
              {syncResult.totalMihawkRowsOnPage} lignes Mihawk sur la page · {syncResult.alreadyInDb} déjà en base · <b className="text-gold">{syncResult.newDecksDetected} nouvelles</b>
            </div>
          )}
      </section>

      <section className="card-tile p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <select className="input" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
            <option value="">Tous statuts</option>
            <option value="winner">Winner (1st)</option>
            <option value="top_performer">Top Performers (Top 4/8, 2nd...)</option>
            <option value="unverified">Résultat ambigu</option>
          </select>
          <input className="input" placeholder="Pays" value={filters.country} onChange={(e) => setFilters((f) => ({ ...f, country: e.target.value }))} />
          <input className="input" placeholder="Joueur" value={filters.player} onChange={(e) => setFilters((f) => ({ ...f, player: e.target.value }))} />
        </div>
        <label className="text-xs font-mono flex items-center gap-1.5">
          <input type="checkbox" checked={filters.undefeated} onChange={(e) => setFilters((f) => ({ ...f, undefeated: e.target.checked }))} />
          Invaincu uniquement
        </label>
      </section>

      <div className="text-xs font-mono text-steel/60">
        {loading ? "Recherche..." : `${decks.length} deck${decks.length > 1 ? "s" : ""} trouvé${decks.length > 1 ? "s" : ""}`}
      </div>

      {loading ? (
        <div className="text-steel/60 text-sm font-mono">Chargement...</div>
      ) : decks.length === 0 ? (
        <div className="text-steel/60 text-sm font-mono">
          Aucun deck importé. Lance le test puis l'import ci-dessus.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {decks.map((d) => (
            <Link key={d.id} href={`/decks/${d.id}`} className="card-tile rounded-sm p-4 block hover:border-emerald">
              <div className="flex items-center justify-between mb-1">
                <span className="text-white text-sm">{d.deckName}</span>
                <div className="flex gap-1">
                  {d.status === "winner" && <span className="badge badge-gold">Winner</span>}
                  {d.undefeated && <span className="badge badge-green">Undefeated</span>}
                  {d.status === "top_performer" && <span className="badge">Top Cut</span>}
                </div>
              </div>
              <div className="text-xs font-mono text-steel/70">{d.player} · {d.country} · {d.date}</div>
              <div className="text-xs font-mono text-steel/70">{d.placementRaw} · {d.tournamentType} · {d.host}{d.participants ? ` (${d.participants} joueurs)` : ""}</div>
              {d.validationStatus === "needs_review" && (
                <div className="text-xs font-mono text-red-400 mt-1">⚠ Données à vérifier ({d.cardCountNonLeader}/50 cartes)</div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
