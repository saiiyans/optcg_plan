"use client";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function KeyCardsPage() {
  const router = useRouter();
  const [leaders, setLeaders] = useState<any[]>([]);
  const [greenCards, setGreenCards] = useState<any[]>([]);
  const [leaderImages, setLeaderImages] = useState<Record<string, string>>({});
  const [entries, setEntries] = useState<any[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [loadProgress, setLoadProgress] = useState({ done: 0, total: 0 });
  const [showAllLeaders, setShowAllLeaders] = useState(false);
  // Ce qui est glissé : soit une carte de la palette (copie, jamais retirée),
  // soit une carte déjà posée chez un leader (déplacement — retirée de
  // l'ancien leader en arrivant sur le nouveau).
  const dragRef = useRef<{ cardNumber: string; fromLeader: string | null } | null>(null);

  const load = async () => {
    setState("loading");
    try {
      const [leadersRes, keyCardsRes] = await Promise.all([
        fetch("/api/tier-list").then((r) => r.json()),
        fetch("/api/key-cards").then((r) => r.json()),
      ]);
      if (!leadersRes.ok || !keyCardsRes.ok) throw new Error();
      const realLeaders = leadersRes.entries.filter((e: any) => e.cardNumber && !e.cardNumber.startsWith("CUSTOM-"));
      setLeaders(realLeaders);
      setEntries(keyCardsRes.entries);

      // Images des leaders — un seul appel groupé plutôt qu'un fetch par
      // leader (plus rapide, moins de requêtes).
      const imgMap: Record<string, string> = {};
      await Promise.all(
        realLeaders.map(async (l: any) => {
          const r = await fetch(`/api/cards?q=${l.cardNumber}&limit=5&color=all`);
          const d = await r.json();
          const c = (d.cards || []).find((x: any) => x.cardNumber === l.cardNumber);
          if (c?.imageUrl) imgMap[l.cardNumber] = c.imageUrl;
        })
      );
      setLeaderImages(imgMap);

      let offset = 0;
      let all: any[] = [];
      let total = Infinity;
      while (offset < total) {
        const res = await fetch(`/api/cards?color=Green&limit=200&offset=${offset}&category=Character`);
        const d = await res.json();
        if (!d.ok) throw new Error();
        total = d.total;
        all = all.concat(d.cards);
        offset += d.cards.length;
        setLoadProgress({ done: all.length, total });
        if (d.cards.length === 0) break;
      }
      setGreenCards(all);
      setState("ready");
    } catch {
      setState("error");
    }
  };

  useEffect(() => {
    load();
  }, []);

  async function addKeyCard(cardNumber: string, leaderCardNumber: string) {
    setEntries((prev) =>
      prev.some((e) => e.cardNumber === cardNumber && e.leaderCardNumber === leaderCardNumber)
        ? prev
        : [...prev, { cardNumber, leaderCardNumber }]
    );
    await fetch("/api/key-cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardNumber, leaderCardNumber }),
    });
  }

  async function removeKeyCard(cardNumber: string, leaderCardNumber: string) {
    setEntries((prev) => prev.filter((e) => !(e.cardNumber === cardNumber && e.leaderCardNumber === leaderCardNumber)));
    await fetch(`/api/key-cards?cardNumber=${encodeURIComponent(cardNumber)}&leaderCardNumber=${encodeURIComponent(leaderCardNumber)}`, {
      method: "DELETE",
    });
  }

  // Dépose sur la ligne d'un leader : copie depuis la palette (reste dans
  // la palette), ou déplacement depuis un autre leader (retiré de l'ancien).
  async function onDropOnLeader(targetLeader: string) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    if (drag.fromLeader === targetLeader) return; // déposé sur sa propre ligne, rien à faire
    if (drag.fromLeader) {
      await removeKeyCard(drag.cardNumber, drag.fromLeader);
    }
    await addKeyCard(drag.cardNumber, targetLeader);
  }

  const sortedLeaders = [...leaders].sort((a, b) => {
    const order: Record<string, number> = { S: 0, A: 1, B: 2, C: 3, D: 4 };
    return (order[a.tier] ?? 5) - (order[b.tier] ?? 5);
  });
  const visibleLeaders = showAllLeaders ? sortedLeaders : sortedLeaders.filter((l) => ["S", "A", "B"].includes(l.tier));
  const cardByNumber = new Map(greenCards.map((c) => [c.cardNumber, c]));

  return (
    <div className="space-y-6">
      <div className="card-tile p-5">
        <h1 className="text-[28px] sm:text-3xl font-display font-bold text-white mb-2">Key Cards — cartes clés par matchup</h1>
        <p className="text-xs text-steel/60 mb-3">
          Glisse une carte depuis la palette en bas vers la ligne d'un leader — elle reste dans la palette, réutilisable pour d'autres leaders. Glisse une carte déjà posée vers un autre leader pour la déplacer. Double-clique une carte posée pour la retirer.
        </p>
        <button onClick={() => setShowAllLeaders((s) => !s)} className={`chip ${showAllLeaders ? "chip-active" : ""}`}>
          {showAllLeaders ? `Tous les leaders (${sortedLeaders.length})` : `Leaders méta S/A/B uniquement (${visibleLeaders.length}) — clique pour voir tous`}
        </button>
      </div>

      {state === "loading" && (
        <div className="card-tile p-5">
          <div className="text-xs font-mono text-steel/60 mb-2">Chargement... {loadProgress.done}/{loadProgress.total || "?"} cartes</div>
          <div className="skeleton h-64" />
        </div>
      )}
      {state === "error" && <div className="card-tile p-5 text-xs text-danger">Impossible de charger les données.</div>}

      {state === "ready" && (
        <>
          {/* LEADERS EN BANDES HORIZONTALES — cohérent avec les autres Tier Lists */}
          <div className="card-tile p-0 overflow-hidden">
            {visibleLeaders.map((leader) => {
              const keyCards = entries.filter((e) => e.leaderCardNumber === leader.cardNumber);
              return (
                <div
                  key={leader.cardNumber}
                  className="flex border-b border-line last:border-b-0"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDropOnLeader(leader.cardNumber)}
                >
                  <div
                    onClick={() => router.push(`/cards/${leader.cardNumber}`)}
                    title={leader.displayName}
                    className="w-24 sm:w-28 shrink-0 flex flex-col items-center justify-center bg-panel2 border-r border-line py-2 cursor-pointer hover:bg-panel"
                  >
                    <div className="relative rounded overflow-hidden border border-line" style={{ width: 56, height: 78 }}>
                      {leaderImages[leader.cardNumber] ? (
                        <Image src={leaderImages[leader.cardNumber]} alt={leader.displayName} fill sizes="56px" className="object-cover" unoptimized={leaderImages[leader.cardNumber].includes("spellmana.com")} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[7px] text-steel/60 text-center px-0.5">{leader.displayName}</div>
                      )}
                    </div>
                    <div className="text-[9px] text-center text-steel/70 leading-tight mt-1 truncate w-full px-1" title={leader.displayName}>{leader.displayName}</div>
                  </div>
                  <div className="flex-1 flex flex-wrap gap-1 p-2 bg-ink min-h-[80px] items-center">
                    {keyCards.length === 0 && <div className="text-[10px] text-steel/40 px-2">Dépose des cartes clés ici</div>}
                    {keyCards.map((e) => {
                      const card = cardByNumber.get(e.cardNumber);
                      return (
                        <div
                          key={e.cardNumber}
                          draggable
                          onDragStart={() => (dragRef.current = { cardNumber: e.cardNumber, fromLeader: leader.cardNumber })}
                          onDoubleClick={() => removeKeyCard(e.cardNumber, e.leaderCardNumber)}
                          onClick={() => router.push(`/cards/${e.cardNumber}`)}
                          title={`${card?.name ?? e.cardNumber} — glisse vers un autre leader pour déplacer, double-clic pour retirer`}
                          className="relative cursor-grab active:cursor-grabbing rounded overflow-hidden border border-emerald shrink-0"
                          style={{ width: 44, height: 62 }}
                        >
                          {card?.imageUrl ? (
                            <Image src={card.imageUrl} alt={card.name} fill sizes="44px" className="object-cover" unoptimized={card.imageUrl.includes("spellmana.com")} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-panel2 text-[6px] text-steel/60 text-center px-0.5">{e.cardNumber}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* PALETTE — toutes les cartes vertes, jamais retirées après dépôt */}
          <div className="card-tile p-3">
            <div className="text-[11px] font-mono uppercase text-gold mb-2">Palette — toutes les cartes vertes ({greenCards.length})</div>
            <div className="flex flex-wrap gap-1 max-h-[300px] overflow-y-auto">
              {greenCards.map((c) => (
                <div
                  key={c.cardNumber}
                  draggable
                  onDragStart={() => (dragRef.current = { cardNumber: c.cardNumber, fromLeader: null })}
                  title={`${c.name} — glisse vers un leader`}
                  className="relative cursor-grab active:cursor-grabbing rounded overflow-hidden border border-line hover:border-emerald shrink-0"
                  style={{ width: 44, height: 62 }}
                >
                  {c.imageUrl ? (
                    <Image src={c.imageUrl} alt={c.name} fill sizes="44px" className="object-cover" unoptimized={c.imageUrl.includes("spellmana.com")} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-ink text-[6px] text-steel/60 text-center px-0.5">{c.cardNumber}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
