"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { LEADERS } from "@/lib/leaders";

export default function MyDecksPage() {
  const [savedDecks, setSavedDecks] = useState<any[]>([]);
  const [personalDecks, setPersonalDecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [savedRes, personalRes] = await Promise.all([
      fetch("/api/tournament-decks?saved=true").then((r) => r.json()),
      fetch("/api/personal-decks").then((r) => r.json()),
    ]);
    setSavedDecks(savedRes.decks ?? []);
    setPersonalDecks(personalRes.decks ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function deletePersonalDeck(id: string) {
    if (!confirm("Supprimer ce deck ?")) return;
    await fetch(`/api/personal-decks/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-display text-white">Mes Decks</h2>
      </div>

      <AddNewDeckSection onAdded={load} />

      {/* Decks construits à la main / collés */}
      <section className="space-y-3">
        <h3 className="font-mono text-xs uppercase tracking-widest text-gold border-b border-line pb-2">
          Mes decks personnels
        </h3>
        {loading ? (
          <div className="text-steel/60 text-sm font-mono">Chargement...</div>
        ) : personalDecks.length === 0 ? (
          <div className="card-tile p-5 text-sm text-steel/70">Aucun deck personnel pour l'instant — ajoute-en un ci-dessus.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {personalDecks.map((d) => {
              const total = d.cards.reduce((s: number, c: any) => s + c.quantity, 0);
              return (
                <Link key={d.id} href={`/my-decks/${d.id}`} className="card-tile p-4 block hover:border-emerald transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-sm">{d.name}</span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        deletePersonalDeck(d.id);
                      }}
                      className="text-steel/60 hover:text-red-400 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="text-xs font-mono text-steel/70">{d.leaderCardNumber} · {total} cartes hors Leader</div>
                  <div className="text-xs font-mono text-steel/60 mt-1">
                    Créé le {new Date(d.createdAt).toLocaleDateString("fr-FR")}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Decks gagnants sauvegardés depuis Winning Decks */}
      <section className="space-y-3">
        <h3 className="font-mono text-xs uppercase tracking-widest text-gold border-b border-line pb-2">
          Decks gagnants sauvegardés
        </h3>
        {loading ? (
          <div className="text-steel/60 text-sm font-mono">Chargement...</div>
        ) : savedDecks.length === 0 ? (
          <div className="card-tile p-5 text-sm text-steel/70">
            Aucun deck sauvegardé pour l'instant. Va sur{" "}
            <Link href="/decks" className="underline text-emerald-bright">Winning Decks</Link>, ouvre un deck et clique
            "+ Ajouter à Mes Decks".
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {savedDecks.map((d) => (
              <Link key={d.id} href={`/decks/${d.id}`} className="card-tile p-4 block hover:border-emerald">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white text-sm">{d.deckName}</span>
                  <div className="flex gap-1">
                    {d.status === "winner" && <span className="badge badge-gold">Winner</span>}
                    {d.undefeated && <span className="badge badge-green">Undefeated</span>}
                  </div>
                </div>
                <div className="text-xs font-mono text-steel/70">{d.player} · {d.country} · {d.date}</div>
                <div className="text-xs font-mono text-steel/70">{d.placementRaw} · {d.tournamentType} · {d.host}</div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function AddNewDeckSection({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [leaderCardNumber, setLeaderCardNumber] = useState(LEADERS[0].leaderCardNumber);
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      setRaw(text);
    } catch {
      setResult({ ok: false, error: "Impossible de lire le presse-papier — colle manuellement avec Ctrl+V dans la zone de texte." });
    }
  }

  async function submit() {
    if (!name.trim() || !raw.trim()) {
      setResult({ ok: false, error: "Donne un nom au deck et colle une decklist." });
      return;
    }
    setBusy(true);
    const res = await fetch("/api/personal-decks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, leaderCardNumber, raw }),
    });
    const data = await res.json();
    setResult(data);
    setBusy(false);
    if (data.ok) {
      setName("");
      setRaw("");
      onAdded();
    }
  }

  return (
    <section className="card-tile p-5">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center justify-between w-full text-left">
        <span className="font-mono text-xs uppercase tracking-widest text-gold">+ Add New Deck</span>
        <span className="text-steel/60 text-xs">{open ? "Masquer ▲" : "Ouvrir ▼"}</span>
      </button>

      {open && (
        <div className="mt-4 pt-4 border-t border-line space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              className="input w-full"
              placeholder="Nom du deck (ex. Mon Shanks test 1)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <select className="input w-full" value={leaderCardNumber} onChange={(e) => setLeaderCardNumber(e.target.value)}>
              {LEADERS.map((l) => (
                <option key={l.key} value={l.leaderCardNumber}>{l.label}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-mono text-steel/60">Decklist (collée depuis le presse-papier)</label>
              <button onClick={pasteFromClipboard} className="btn text-xs py-1.5 px-3">📋 Coller depuis le presse-papier</button>
            </div>
            <textarea
              className="input w-full"
              rows={6}
              placeholder={'Colle ici, ex :\n1nOP14-020a4nOP07-022a4nOP12-034a...\nou\n4x OP07-022\n4x OP12-034\n...'}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
            />
          </div>

          <button onClick={submit} disabled={busy} className="btn btn-primary">
            {busy ? "Ajout en cours..." : "Ajouter le deck"}
          </button>

          {result && (
            <div className={`text-xs font-mono p-3 rounded-lg ${result.ok ? "bg-panel2 text-steel/80" : "bg-red-950 text-red-400"}`}>
              {result.ok ? (
                <>
                  {result.added.length} carte(s) ajoutée(s) ({result.totalCards} exemplaires au total).
                  {result.note && <div className="mt-1 text-gold">{result.note}</div>}
                </>
              ) : (
                result.error
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
