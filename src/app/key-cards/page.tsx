"use client";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function KeyCardsPage() {
  const router = useRouter();
  const [leaders, setLeaders] = useState<any[]>([]);
  const [greenCards, setGreenCards] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [loadProgress, setLoadProgress] = useState({ done: 0, total: 0 });
  const [showAllLeaders, setShowAllLeaders] = useState(false);
  const dragKey = useRef<string | null>(null);

  const load = async () => {
    setState("loading");
    try {
      const [leadersRes, keyCardsRes] = await Promise.all([
        fetch("/api/tier-list").then((r) => r.json()),
        fetch("/api/key-cards").then((r) => r.json()),
      ]);
      if (!leadersRes.ok || !keyCardsRes.ok) throw new Error();
      setLeaders(leadersRes.entries.filter((e: any) => e.cardNumber && !e.cardNumber.startsWith("CUSTOM-")));
      setEntries(keyCardsRes.entries);

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
    // Mise à jour optimiste
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
          Glisse une carte verte depuis la palette en bas vers la colonne d'un leader pour dire "cette carte est clé contre ce leader". Une carte peut être clé contre plusieurs leaders — elle reste dans la palette après un dépôt, tu peux la réutiliser autant de fois que nécessaire.
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
          {/* TABLEAU — leaders en colonnes */}
          <div className="card-tile p-3 overflow-x-auto">
            <div className="flex gap-2" style={{ minWidth: visibleLeaders.length * 92 }}>
              {visibleLeaders.map((leader) => {
                const keyCards = entries.filter((e) => e.leaderCardNumber === leader.cardNumber);
                return (
                  <div
                    key={leader.cardNumber}
                    className="w-20 shrink-0 flex flex-col"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragKey.current) addKeyCard(dragKey.current, leader.cardNumber);
                      dragKey.current = null;
                    }}
                  >
                    <div
                      onClick={() => router.push(`/cards/${leader.cardNumber}`)}
                      title={leader.displayName}
                      className="relative rounded overflow-hidden border border-line hover:border-emerald cursor-pointer mb-1"
                      style={{ width: 80, height: 112 }}
                    >
                      <LeaderImg cardNumber={leader.cardNumber} name={leader.displayName} />
                    </div>
                    <div className="text-[9px] text-center text-steel/70 leading-tight mb-1 truncate" title={leader.displayName}>{leader.displayName}</div>
                    <div className="flex-1 bg-panel2 rounded p-1 min-h-[120px] space-y-1 border border-dashed border-line">
                      {keyCards.length === 0 && <div className="text-[8px] text-steel/30 text-center pt-2">Dépose ici</div>}
                      {keyCards.map((e) => {
                        const card = cardByNumber.get(e.cardNumber);
                        return (
                          <div
                            key={e.cardNumber}
                            onDoubleClick={() => removeKeyCard(e.cardNumber, e.leaderCardNumber)}
                            onClick={() => router.push(`/cards/${e.cardNumber}`)}
                            title={`${card?.name ?? e.cardNumber} — double-clic pour retirer`}
                            className="relative rounded overflow-hidden border border-emerald cursor-pointer"
                            style={{ width: "100%", aspectRatio: "44/62" }}
                          >
                            {card?.imageUrl ? (
                              <Image src={card.imageUrl} alt={card.name} fill sizes="72px" className="object-cover" unoptimized={card.imageUrl.includes("spellmana.com")} />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-ink text-[6px] text-steel/60 text-center px-0.5">{e.cardNumber}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* PALETTE — toutes les cartes vertes, jamais retirées après dépôt */}
          <div className="card-tile p-3">
            <div className="text-[11px] font-mono uppercase text-gold mb-2">Palette — toutes les cartes vertes ({greenCards.length})</div>
            <div className="flex flex-wrap gap-1 max-h-[300px] overflow-y-auto">
              {greenCards.map((c) => (
                <div
                  key={c.cardNumber}
                  draggable
                  onDragStart={() => (dragKey.current = c.cardNumber)}
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

function LeaderImg({ cardNumber, name }: { cardNumber: string; name: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    fetch(`/api/cards?q=${cardNumber}&limit=5&color=all`)
      .then((r) => r.json())
      .then((d) => {
        const c = (d.cards || []).find((x: any) => x.cardNumber === cardNumber);
        setUrl(c?.imageUrl || null);
      })
      .catch(() => {});
  }, [cardNumber]);
  if (!url) return <div className="w-full h-full flex items-center justify-center bg-ink text-[7px] text-steel/60 text-center px-0.5">{name}</div>;
  return <Image src={url} alt={name} fill sizes="80px" className="object-cover" unoptimized={url.includes("spellmana.com")} />;
}
