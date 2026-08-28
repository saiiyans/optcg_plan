"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { LEADERS } from "@/lib/leaders";
import { LeaderImage } from "@/components/LeaderImage";

export default function WinningDecksPage() {
  const [leaderKey, setLeaderKey] = useState<string>("mihawk");
  const [decks, setDecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ status: "", undefeated: false, country: "", player: "", source: "" });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [test3Result, setTest3Result] = useState<any>(null);
  const [syncResult, setSyncResult] = useState<any>(null);

  // Panneau Limitless (US / International) — état séparé du panneau Asie
  // ci-dessus pour ne jamais mélanger le statut/résultat des deux imports.
  const [busyIntl, setBusyIntl] = useState(false);
  const [statusIntl, setStatusIntl] = useState("");
  const [test3ResultIntl, setTest3ResultIntl] = useState<any>(null);
  const [syncResultIntl, setSyncResultIntl] = useState<any>(null);

  // Panneau OPTCG.gg (3e source, "US/International" elle aussi) — état
  // séparé des 2 panneaux ci-dessus, même logique.
  const [busyOptcgg, setBusyOptcgg] = useState(false);
  const [statusOptcgg, setStatusOptcgg] = useState("");
  const [test3ResultOptcgg, setTest3ResultOptcgg] = useState<any>(null);
  const [syncResultOptcgg, setSyncResultOptcgg] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("leader", leaderKey);
    if (filters.status) params.set("status", filters.status);
    if (filters.undefeated) params.set("undefeated", "true");
    if (filters.country) params.set("country", filters.country);
    if (filters.player) params.set("player", filters.player);
    if (filters.source) params.set("source", filters.source);
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
    setStatus("Test sur 3 decklists Mihawk réelles (Asie)...");
    const res = await fetch("/api/tournament-decks/test3");
    const data = await res.json();
    setTest3Result(data);
    setStatus(data.ok ? "Test terminé." : `Erreur : ${data.error}`);
    setBusy(false);
  }

  async function runSync() {
    setBusy(true);
    setStatus("Recherche de nouveaux résultats OP17 (Asie)...");
    const res = await fetch("/api/tournament-decks/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const data = await res.json();
    setSyncResult(data);
    setStatus(data.ok ? `${data.newDecksDetected} nouveau(x) deck(s) détecté(s).` : `Erreur : ${data.error}`);
    setBusy(false);
  }

  async function runImport() {
    if (!confirm("Importer toutes les decklists Mihawk (op14mihawk) trouvées sur la page OP17 (Asie, onepiecetopdecks.com) ?")) return;
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

  async function runTest3Intl() {
    setBusyIntl(true);
    setStatusIntl("Test sur 3 decklists Mihawk réelles (US/International)...");
    const res = await fetch("/api/tournament-decks/limitless/test3");
    const data = await res.json();
    setTest3ResultIntl(data);
    setStatusIntl(data.ok ? "Test terminé." : `Erreur : ${data.error}`);
    setBusyIntl(false);
  }

  async function runSyncIntl() {
    setBusyIntl(true);
    setStatusIntl("Recherche de nouveaux résultats (US/International)...");
    const res = await fetch("/api/tournament-decks/limitless/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const data = await res.json();
    setSyncResultIntl(data);
    setStatusIntl(data.ok ? `${data.newDecksDetected} nouveau(x) deck(s) détecté(s).` : `Erreur : ${data.error}`);
    setBusyIntl(false);
  }

  async function runImportIntl() {
    if (!confirm("Importer tous les résultats Mihawk trouvés sur Limitless TCG (US/International) ? Cette source fait une 2e requête par decklist (parsing des cartes), donc c'est plus lent que l'import Asie.")) return;
    setBusyIntl(true);
    setStatusIntl("Import en cours (une requête par decklist, ça peut prendre un moment)...");
    const res = await fetch("/api/tournament-decks/limitless/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: true }),
    });
    const data = await res.json();
    setStatusIntl(data.ok ? `${data.created} deck(s) importé(s), ${data.skippedDuplicate} déjà en base${data.needsReview ? `, ${data.needsReview} à vérifier` : ""}.` : `Erreur : ${data.error}`);
    setBusyIntl(false);
    load();
  }

  async function runTest3Optcgg() {
    setBusyOptcgg(true);
    setStatusOptcgg("Test sur 3 decklists Mihawk réelles (OPTCG.gg)...");
    const res = await fetch("/api/tournament-decks/optcgg/test3");
    const data = await res.json();
    setTest3ResultOptcgg(data);
    setStatusOptcgg(data.ok ? "Test terminé." : `Erreur : ${data.error}`);
    setBusyOptcgg(false);
  }

  async function runSyncOptcgg() {
    setBusyOptcgg(true);
    setStatusOptcgg("Recherche de nouveaux résultats (OPTCG.gg)...");
    const res = await fetch("/api/tournament-decks/optcgg/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const data = await res.json();
    setSyncResultOptcgg(data);
    setStatusOptcgg(data.ok ? `${data.newDecksDetected} nouveau(x) deck(s) détecté(s).` : `Erreur : ${data.error}`);
    setBusyOptcgg(false);
  }

  async function runImportOptcgg() {
    if (!confirm("Importer tous les résultats Mihawk trouvés sur OPTCG.gg ?")) return;
    setBusyOptcgg(true);
    setStatusOptcgg("Import en cours...");
    const res = await fetch("/api/tournament-decks/optcgg/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: true }),
    });
    const data = await res.json();
    setStatusOptcgg(data.ok ? `${data.created} deck(s) importé(s), ${data.skippedDuplicate} déjà en base${data.needsReview ? `, ${data.needsReview} à vérifier` : ""}.` : `Erreur : ${data.error}`);
    setBusyOptcgg(false);
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
            🌏 Asie — import depuis onepiecetopdecks.com (OP17, Japon)
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

      {/* PANNEAU LIMITLESS — deuxième source, complémentaire à la source
          Asie ci-dessus. Le nom "US" vient de la demande du joueur ; en
          vrai les résultats Limitless couvrent l'Europe et les Amériques
          (Wolverhampton, Utrecht, Bielefeld, Toronto, Barcelona, Warsaw,
          São Paulo... pas que les États-Unis) — précisé dans le sous-titre
          plutôt que de laisser croire à une couverture purement US. Cette
          source fait 2 requêtes par deck (tableau de résultats + page de
          decklist individuelle pour les cartes), donc plus lente à
          importer que la source Asie. */}
      <section className="card-tile p-5 border-emerald/30">
          <h2 className="font-mono text-xs uppercase tracking-widest text-gold mb-1 border-b border-line pb-2">
            🌍 US / International — import depuis Limitless TCG
          </h2>
          <p className="text-[11px] text-steel/50 mt-1.5 mb-3">
            Regionals et Treasure Cups suivis par Limitless (Europe + Amériques — pas exclusivement les États-Unis).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
            <button onClick={runTest3Intl} disabled={busyIntl} className="btn">1. Tester sur 3 decklists</button>
            <button onClick={runImportIntl} disabled={busyIntl} className="btn btn-primary">2. Importer (confirmation requise)</button>
            <button onClick={runSyncIntl} disabled={busyIntl} className="btn">Mettre à jour les résultats</button>
          </div>
          {statusIntl && <div className="text-xs text-steel/80 font-mono">{statusIntl}</div>}

          {test3ResultIntl && (
            <div className="mt-3 space-y-2">
              <div className="text-xs font-mono text-steel/70">
                {test3ResultIntl.totalRowsFound} résultat(s) Mihawk trouvé(s) au total sur la page — {test3ResultIntl.sample?.length} testé(s) ici.
              </div>
              {test3ResultIntl.errors?.length > 0 && (
                <div className="text-xs font-mono text-red-400">
                  {test3ResultIntl.errors.map((e: any, i: number) => <div key={i}>⚠ {e.row} : {e.error}</div>)}
                </div>
              )}
              {test3ResultIntl.sample?.map((d: any, i: number) => (
                <div key={i} className="bg-panel2 p-3 rounded text-xs font-mono">
                  <div className="text-white">G Mihawk — {d.player} — {d.date}</div>
                  <div className="text-steel/70">Placement : {d.placementRaw} · {d.format} · {d.tournamentName}</div>
                  <div className={d.parseValid ? "text-emerald-bright" : "text-red-400"}>
                    {d.cardCountNonLeader} cartes hors Leader — {d.parseValid ? "✓ Liste valide (50 cartes)" : `⚠ ${d.parseErrors.join("; ")}`}
                  </div>
                </div>
              ))}
            </div>
          )}

          {syncResultIntl && (
            <div className="mt-3 text-xs font-mono bg-panel2 p-3 rounded">
              {syncResultIntl.totalRowsOnPage} lignes sur la page · {syncResultIntl.alreadyInDb} déjà en base · <b className="text-gold">{syncResultIntl.newDecksDetected} nouvelles</b>
            </div>
          )}
      </section>

      {/* PANNEAU OPTCG.GG — 3e source, classée "international" elle aussi
          (voir regionOf() côté API) car cette source ne fournit pas non
          plus de pays par résultat. Contrairement aux 2 sources ci-dessus,
          le détail des cartes vient d'une vraie API JSON — pas de parsing
          HTML fragile pour les decklists individuelles ici. */}
      <section className="card-tile p-5 border-emerald/30">
          <h2 className="font-mono text-xs uppercase tracking-widest text-gold mb-1 border-b border-line pb-2">
            🏆 OPTCG.gg — 3e source de résultats (US/International)
          </h2>
          <p className="text-[11px] text-steel/50 mt-1.5 mb-3">
            Flux "Top Decks" récent d'OPTCG.gg (ex. ChinoizeCup). Pas de pays par résultat non plus — classé "International" comme Limitless.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
            <button onClick={runTest3Optcgg} disabled={busyOptcgg} className="btn">1. Tester sur 3 decklists</button>
            <button onClick={runImportOptcgg} disabled={busyOptcgg} className="btn btn-primary">2. Importer (confirmation requise)</button>
            <button onClick={runSyncOptcgg} disabled={busyOptcgg} className="btn">Mettre à jour les résultats</button>
          </div>
          {statusOptcgg && <div className="text-xs text-steel/80 font-mono">{statusOptcgg}</div>}

          {test3ResultOptcgg && (
            <div className="mt-3 space-y-2">
              <div className="text-xs font-mono text-steel/70">
                {test3ResultOptcgg.mihawkRowsFound} résultat(s) Mihawk trouvé(s) au total sur la page — {test3ResultOptcgg.sample?.length} testé(s) ici.
              </div>
              {test3ResultOptcgg.errors?.length > 0 && (
                <div className="text-xs font-mono text-red-400">
                  {test3ResultOptcgg.errors.map((e: any, i: number) => <div key={i}>⚠ {e.row} : {e.error}</div>)}
                </div>
              )}
              {test3ResultOptcgg.sample?.map((d: any, i: number) => (
                <div key={i} className="bg-panel2 p-3 rounded text-xs font-mono">
                  <div className="text-white">G Mihawk — {d.player} — {d.eventDate}</div>
                  <div className="text-steel/70">Placement : {d.placementRaw} · {d.format} · {d.eventName}</div>
                  <div className={d.parseValid ? "text-emerald-bright" : "text-red-400"}>
                    {d.cardCountNonLeader} cartes hors Leader — {d.parseValid ? "✓ Liste valide (50 cartes)" : `⚠ ${d.parseErrors.join("; ")}`}
                  </div>
                </div>
              ))}
            </div>
          )}

          {syncResultOptcgg && (
            <div className="mt-3 text-xs font-mono bg-panel2 p-3 rounded">
              {syncResultOptcgg.totalRowsOnPage} résultat(s) Mihawk sur la page · {syncResultOptcgg.alreadyInDb} déjà en base · <b className="text-gold">{syncResultOptcgg.newDecksDetected} nouvelles</b>
            </div>
          )}
      </section>

      <section className="card-tile p-4 space-y-3">
        <div className="flex gap-1.5">
          {[
            { v: "", label: "Toutes régions" },
            { v: "asia", label: "🌏 Asie" },
            { v: "international", label: "🌍 US/International" },
          ].map((o) => (
            <button
              key={o.v}
              onClick={() => setFilters((f) => ({ ...f, source: o.v }))}
              className={`text-xs font-mono px-3 py-1.5 rounded-full border transition-colors duration-150 ${
                filters.source === o.v ? "bg-flame/20 border-flame text-white" : "border-line text-steel/60 hover:text-white"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
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
                  <span className="badge text-[10px]">{d.region === "international" ? "🌍" : "🌏"}</span>
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
