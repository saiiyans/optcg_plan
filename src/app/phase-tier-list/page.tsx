"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CardImage } from "@/components/CardImage";

// DON!! réellement disponible à chaque tour, selon les vraies règles du
// jeu (le joueur qui commence est limité à 1 DON!! au tour 1, plafond à
// 10 DON!! au total).
const DON_PER_TURN_FIRST = [
  { turn: 1, don: 1 },
  { turn: 2, don: 3 },
  { turn: 3, don: 5 },
  { turn: 4, don: 7 },
  { turn: 5, don: 9 },
  { turn: 6, don: 10 },
];
const DON_PER_TURN_SECOND = [
  { turn: 1, don: 2 },
  { turn: 2, don: 4 },
  { turn: 3, don: 6 },
  { turn: 4, don: 8 },
  { turn: 5, don: 10 },
];

function phaseLabel(turn: number, don: number, going: "first" | "second") {
  return `Tour ${turn} (${don} DON!!)`;
}

// Range de coût couverte par chaque tour — un personnage devient jouable
// au premier tour où le DON!! disponible atteint son coût.
function buildRanges(schedule: { turn: number; don: number }[]) {
  return schedule.map((s, i) => {
    const prevDon = i === 0 ? -1 : schedule[i - 1].don; // -1 pour que minCost=0 sur le premier tour (inclut les rares cartes coût 0)
    return { ...s, minCost: prevDon + 1, maxCost: s.don };
  });
}

export default function PhaseTierListPage() {
  const router = useRouter();
  const [cards, setCards] = useState<any[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [going, setGoing] = useState<"first" | "second">("first");
  const [loadProgress, setLoadProgress] = useState({ done: 0, total: 0 });

  useEffect(() => {
    (async () => {
      setState("loading");
      try {
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
        setCards(all.filter((c) => c.cost != null));
        setState("ready");
      } catch {
        setState("error");
      }
    })();
  }, []);

  const schedule = going === "first" ? DON_PER_TURN_FIRST : DON_PER_TURN_SECOND;
  const ranges = buildRanges(schedule);

  const byPhase = ranges.map((r) => ({
    ...r,
    cards: cards.filter((c) => c.cost >= r.minCost && c.cost <= r.maxCost).sort((a, b) => a.cost - b.cost),
  }));
  const tooExpensive = cards.filter((c) => c.cost > schedule[schedule.length - 1].don);

  return (
    <div className="space-y-6">
      {/* EN-TÊTE (refonte — style Nakama Companion, cohérent avec
          Cartes/Matchups/Tier List des leaders) */}
      <div className="pt-1 pb-1">
        <span className="eyebrow-flame">✦ One Piece TCG · Meta Tool</span>
        <h1 className="mt-1.5 text-3xl sm:text-4xl font-extrabold tracking-tight text-ivory leading-[1.05]">
          Classe par <span className="text-flame-gradient italic">phase de DON!!.</span>
        </h1>
        <p className="text-sm text-steel/70 mt-2 max-w-xl mb-3">
          Classement par coût réel des cartes vertes Character, selon le DON!! réellement disponible à chaque tour (règles officielles : 1 DON!! seulement au tour 1 pour le joueur qui commence, plafond de 10 DON!!). Lecture seule — ce n'est pas une opinion, c'est un fait mécanique du jeu.
        </p>
        <div className="flex gap-2">
          <button onClick={() => setGoing("first")} className={`chip ${going === "first" ? "chip-active" : ""}`}>Je commence en premier</button>
          <button onClick={() => setGoing("second")} className={`chip ${going === "second" ? "chip-active" : ""}`}>Je commence en second</button>
        </div>
      </div>

      {state === "loading" && (
        <div className="card-tile p-5">
          <div className="text-xs font-mono text-steel/60 mb-2">Chargement... {loadProgress.done}/{loadProgress.total || "?"} cartes</div>
          <div className="skeleton h-64" />
        </div>
      )}
      {state === "error" && <div className="card-tile p-5 text-xs text-danger">Impossible de charger les cartes.</div>}

      {state === "ready" && (
        <div className="card-tile p-0 overflow-hidden">
          {byPhase.map((p) => (
            <div key={p.turn} className="flex border-b border-line last:border-b-0">
              <div className="w-28 sm:w-32 shrink-0 flex flex-col items-center justify-center text-center bg-panel2 border-r border-line py-3">
                <div className="font-display font-bold text-lg text-emerald-bright">Tour {p.turn}</div>
                <div className="text-[10px] font-mono text-gold">{p.don} DON!!</div>
                <div className="text-[9px] text-steel/50 mt-1">Coût {p.minCost}{p.maxCost > p.minCost ? `–${p.maxCost}` : ""}</div>
              </div>
              <div className="flex-1 flex flex-wrap gap-1 p-2 bg-ink min-h-[80px] max-h-[300px] overflow-y-auto">
                {p.cards.length === 0 && <div className="text-[10px] text-steel/40 flex items-center px-2">Aucune carte à ce coût</div>}
                {p.cards.map((c: any) => (
                  <div
                    key={c.cardNumber}
                    onClick={() => router.push(`/cards/${c.cardNumber}`)}
                    title={`${c.name} — Coût ${c.cost}`}
                    className="relative cursor-pointer rounded overflow-hidden border border-line hover:border-emerald transition-colors bg-panel2 shrink-0"
                    style={{ width: 44, height: 62 }}
                  >
                    <CardImage
                      src={c.imageUrl}
                      alt={c.name}
                      fallbackLabel={c.cardNumber}
                      sizes="44px"
                      fallbackTextClassName="text-[6px] font-mono text-steel/60 leading-tight line-clamp-3"
                    />
                    <span className="absolute bottom-0 right-0 text-[7px] bg-ink/90 text-gold px-0.5 rounded-tl">{c.cost}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {tooExpensive.length > 0 && (
            <div className="flex border-t-2 border-red-500/40">
              <div className="w-28 sm:w-32 shrink-0 flex items-center justify-center text-center bg-panel2 border-r border-line py-3">
                <div className="text-[10px] font-mono text-red-400">Hors de portée</div>
              </div>
              <div className="flex-1 flex flex-wrap gap-1 p-2 bg-ink">
                {tooExpensive.map((c: any) => (
                  <div key={c.cardNumber} onClick={() => router.push(`/cards/${c.cardNumber}`)} title={`${c.name} — Coût ${c.cost}`} className="relative cursor-pointer rounded overflow-hidden border border-line bg-panel2 shrink-0" style={{ width: 44, height: 62 }}>
                    <CardImage src={c.imageUrl} alt={c.name} fallbackLabel={c.cardNumber} sizes="44px" fallbackTextClassName="text-[6px] font-mono text-steel/60 leading-tight line-clamp-3" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-[10px] text-steel/40">
        Règle rappel : en plus du DON!! limité au tour 1 pour le premier joueur, il ne pioche pas non plus à son tour 1 — le second joueur pioche normalement dès son premier tour.
      </p>
    </div>
  );
}
