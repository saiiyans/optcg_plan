"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { CopyDecklistButton } from "@/components/CopyDecklistButton";
import { LEADERS } from "@/lib/leaders";

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
    if (!confirm("Supprimer ce deck ?")) return;
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
                {dc.card.imageUrl ? (
                  <Image src={dc.card.imageUrl} alt={dc.card.name} fill sizes="140px" className="object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-center px-1">
                    <span className="text-[10px] font-mono text-steel/50">{dc.card.cardNumber}</span>
                  </div>
                )}
                <span className="absolute top-1 right-1 bg-emerald-dim text-emerald-bright text-[10px] font-mono px-1.5 py-0.5 rounded">
                  x{dc.quantity}
                </span>
              </div>
              <div className="text-[10px] font-mono text-steel/60 mt-1 truncate">{dc.card.cardNumber}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
