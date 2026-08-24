"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { CopyDecklistButton } from "@/components/CopyDecklistButton";
import { LEADERS } from "@/lib/leaders";
import { CardImage } from "@/components/CardImage";

export default function PersonalDeckDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [deck, setDeck] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/personal-decks/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setDeck(d.ok ? d.deck : null);
        setLoading(false);
      });
  }, [id]);

  async function deleteDeck() {
    if (!confirm(`Supprimer définitivement "${deck.name}" (${deck.leaderCardNumber}, ${totalCards} cartes) ? Cette action est irréversible.`)) return;
    await fetch(`/api/personal-decks/${id}`, { method: "DELETE" });
    router.push("/my-decks");
  }

  if (loading) return <div className="text-steel/60 text-sm font-mono">Chargement...</div>;
  if (!deck) return <div className="text-steel/60 text-sm">Deck introuvable.</div>;

  const leader = LEADERS.find((l) => l.leaderCardNumber === deck.leaderCardNumber);
  const totalCards = deck.cards.reduce((s: number, c: any) => s + c.quantity, 0);

  return (
    <div className="space-y-6">
      <Link href="/my-decks" className="text-xs font-mono text-emerald-bright hover:underline">← Mes Decks</Link>

      <div className="card-tile p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-mono text-steel/60">{deck.leaderCardNumber}</div>
            <h2 className="text-[26px] sm:text-3xl font-display font-bold text-white">{deck.name}</h2>
            <div className="text-xs font-mono text-steel/70 mt-1">
              {totalCards} cartes hors Leader · Créé le {new Date(deck.createdAt).toLocaleDateString("fr-FR")}
            </div>
          </div>
          {leader && <span className={`badge ${leader.badgeClass}`}>{leader.label}</span>}
        </div>
        <div className="mt-4 flex gap-2 flex-wrap">
          <CopyDecklistButton
            leaderCardNumber={deck.leaderCardNumber}
            cards={deck.cards.map((c: any) => ({ cardNumber: c.card.cardNumber, quantity: c.quantity }))}
          />
          <button onClick={deleteDeck} className="btn text-red-400 hover:text-red-300">✕ Supprimer ce deck</button>
        </div>
      </div>

      <div className="card-tile p-5">
        <h3 className="font-mono text-xs uppercase tracking-widest text-gold mb-3 border-b border-line pb-2">
          Cartes du deck ({deck.cards.length} différentes)
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {deck.cards.map((dc: any) => (
            <Link
              key={dc.id}
              href={`/cards/${dc.card.cardNumber}`}
              className="card-tile p-1.5 block hover:border-emerald transition-colors"
            >
              <div className="relative w-full aspect-[5/7] bg-panel2 rounded-sm overflow-hidden">
                <CardImage
                  src={dc.card.imageUrl}
                  alt={dc.card.name}
                  fallbackLabel={dc.card.cardNumber}
                  sizes="140px"
                  loading="lazy"
                />
                <span className="absolute top-1 right-1 bg-emerald-dim text-emerald-bright text-[10px] font-mono px-1.5 py-0.5 rounded">
                  x{dc.quantity}
                </span>
              </div>
              <div className="text-[10px] font-mono text-steel/60 mt-1 truncate">{dc.card.cardNumber}</div>
            </Link>
          ))}
        </div>
      </div>

      <DeckUpdateSection deckId={id} onUpdated={() => {
        fetch(`/api/personal-decks/${id}`).then((r) => r.json()).then((d) => setDeck(d.ok ? d.deck : null));
      }} />

      {deck.versions && deck.versions.length > 0 && (
        <div className="card-tile p-5">
          <h3 className="font-mono text-xs uppercase tracking-widest text-gold mb-3 border-b border-line pb-2">
            Historique des versions ({deck.versions.length})
          </h3>
          <div className="space-y-3">
            {deck.versions.map((v: any) => {
              const list = JSON.parse(v.listJson) as { cardNumber: string; quantity: number }[];
              const total = list.reduce((s, c) => s + c.quantity, 0);
              return (
                <div key={v.id} className="bg-panel2 rounded-lg p-3">
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div className="text-xs font-mono text-steel/60">
                      Archivée le {new Date(v.createdAt).toLocaleDateString("fr-FR")} — {total} cartes, {list.length} références
                    </div>
                  </div>
                  {v.changeReason && <div className="text-xs text-steel/80 mt-1">Raison du changement : {v.changeReason}</div>}
                  {v.personalNote && <div className="text-xs text-steel/70 mt-1 italic">{v.personalNote}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function DeckUpdateSection({ deckId, onUpdated }: { deckId: string; onUpdated: () => void }) {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [personalNote, setPersonalNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function submit() {
    if (!raw.trim()) return;
    if (!confirm("La liste actuelle sera archivée dans l'historique (jamais perdue) puis remplacée par la nouvelle. Continuer ?")) return;
    setBusy(true);
    setResult(null);
    const res = await fetch(`/api/personal-decks/${deckId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw, changeReason, personalNote }),
    });
    const data = await res.json();
    if (data.ok) {
      setResult(`Mise à jour : ${data.added} carte(s) reconnue(s)${data.skipped?.length ? `, ${data.skipped.length} ignorée(s) (numéro inconnu)` : ""}. Ancienne liste archivée.`);
      setRaw("");
      setChangeReason("");
      setPersonalNote("");
      onUpdated();
    } else {
      setResult(`Erreur : ${data.error}`);
    }
    setBusy(false);
  }

  return (
    <div className="card-tile p-5">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center justify-between w-full text-left">
        <h3 className="font-mono text-xs uppercase tracking-widest text-gold">Mettre à jour la liste</h3>
        <span className="text-textMuted text-xs">{open ? "Masquer ▲" : "Ouvrir ▼"}</span>
      </button>
      {open && (
        <div className="mt-3 pt-3 border-t border-line space-y-3">
          <p className="text-xs text-steel/60">
            La liste actuelle sera automatiquement archivée dans l'historique avant d'être remplacée — jamais d'écrasement silencieux.
          </p>
          <textarea
            className="input w-full font-mono text-xs"
            rows={5}
            placeholder={"Colle la nouvelle liste ici, ex :\n4x OP07-022\n4x OP12-034\n..."}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
          />
          <input
            className="input w-full"
            placeholder="Raison du changement (ex. remplacer OP14-030 par ST32-005)"
            value={changeReason}
            onChange={(e) => setChangeReason(e.target.value)}
          />
          <input
            className="input w-full"
            placeholder="Note personnelle (facultatif)"
            value={personalNote}
            onChange={(e) => setPersonalNote(e.target.value)}
          />
          <button onClick={submit} disabled={busy || !raw.trim()} className="btn btn-primary">
            {busy ? "Mise à jour..." : "Mettre à jour (archive l'ancienne version)"}
          </button>
          {result && <div className="text-xs font-mono text-steel/80">{result}</div>}
        </div>
      )}
    </div>
  );
}
