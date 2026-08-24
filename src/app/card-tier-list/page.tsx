"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CardImage } from "@/components/CardImage";

const TIERS = ["S", "A", "B", "C", "D", "?"] as const;
const TIER_BAND_STYLE: Record<string, string> = {
  S: "bg-[#ff7f7f]",
  A: "bg-[#ffbf7f]",
  B: "bg-[#ffdf7f]",
  C: "bg-[#bfff7f]",
  D: "bg-[#7fbfff]",
  "?": "bg-[#9a9a9a]",
};
const TIER_LABEL: Record<string, string> = { S: "S", A: "A", B: "B", C: "C", D: "D", "?": "Non noté" };

// Correspondance étoiles Mihawk <-> tier — réutilise les vraies notes déjà
// calculées (préremplies pour les 17 cartes du deck, complétées par la
// génération Coach) plutôt que d'en inventer une nouvelle échelle.
function starsToTier(stars: number | null | undefined): string {
  if (stars == null) return "?";
  if (stars >= 4.5) return "S";
  if (stars >= 3.5) return "A";
  if (stars >= 2.5) return "B";
  if (stars >= 1) return "C";
  return "D";
}
function tierToStars(tier: string): number {
  return { S: 5, A: 4, B: 3, C: 2, D: 1, "?": 0 }[tier] ?? 0;
}

export default function CardTierListPage() {
  const router = useRouter();
  const [cards, setCards] = useState<any[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [loadProgress, setLoadProgress] = useState({ done: 0, total: 0 });
  const [savedFlash, setSavedFlash] = useState<string | null>(null);
  const dragKey = useState<{ current: string | null }>({ current: null })[0];

  // L'API /api/cards plafonne à 200 résultats par appel (protection contre
  // les requêtes non bornées ailleurs dans l'app) — indispensable ici de
  // paginer nous-mêmes pour vraiment récupérer les 465+ cartes vertes,
  // sinon les cartes qui arrivent après (OP17 notamment) n'étaient jamais
  // chargées du tout.
  const load = async () => {
    setState("loading");
    try {
      let offset = 0;
      let all: any[] = [];
      let total = Infinity;
      while (offset < total) {
        const res = await fetch(`/api/cards?color=Green&limit=200&offset=${offset}&leader=mihawk`);
        const d = await res.json();
        if (!d.ok) throw new Error();
        total = d.total;
        all = all.concat(d.cards);
        offset += d.cards.length;
        setLoadProgress({ done: all.length, total });
        if (d.cards.length === 0) break; // sécurité anti-boucle infinie
      }
      // Les Leaders (dont Mihawk lui-même) ont déjà leur propre Tier List
      // dédiée — on les exclut ici pour ne garder que Character/Event/Stage.
      const nonLeaders = all.filter((c) => c.category !== "Leader");
      setCards(nonLeaders.map((c: any) => ({ ...c, tier: starsToTier(c.rating?.stars) })));
      setState("ready");
    } catch {
      setState("error");
    }
  };

  useEffect(() => {
    load();
  }, []);

  async function moveTier(card: any, tier: string) {
    if (card.tier === tier) return;
    setCards((prev) => prev.map((c) => (c.cardNumber === card.cardNumber ? { ...c, tier } : c)));
    if (tier === "?") return; // "non noté" n'écrit rien, c'est juste l'absence de note
    await fetch(`/api/cards/${card.cardNumber}/rating`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leaderContext: "Mihawk OP14-020", stars: tierToStars(tier) }),
    });
  }

  function onDragStart(card: any) {
    dragKey.current = card.cardNumber;
  }
  function onDropOnTier(tier: string) {
    const card = cards.find((c) => c.cardNumber === dragKey.current);
    if (card) moveTier(card, tier);
    dragKey.current = null;
  }

  const byTier: Record<string, any[]> = { S: [], A: [], B: [], C: [], D: [], "?": [] };
  for (const c of cards) (byTier[c.tier] ?? byTier["?"]).push(c);

  const rated = cards.filter((c) => c.tier !== "?").length;

  return (
    <div className="space-y-6">
      <div className="card-tile p-5">
        <h1 className="text-[28px] sm:text-3xl font-display font-bold text-white mb-2">Tier List des cartes vertes — pour Mihawk OP14-020</h1>
        <p className="text-xs text-steel/60">
          Classement basé sur les notes Mihawk déjà calculées dans l'app (préremplies pour les cartes du deck, complétées par la génération Coach) — pas une nouvelle échelle inventée. {rated}/{cards.length} cartes ont déjà une note ; le reste apparaît en "Non noté" jusqu'à ce que tu les notes toi-même ou que tu relances la génération Coach dans l'onglet Cartes.
        </p>
      </div>

      {state === "loading" && (
        <div className="card-tile p-5">
          <div className="text-xs font-mono text-steel/60 mb-2">
            Chargement... {loadProgress.done}/{loadProgress.total || "?"} cartes
          </div>
          <div className="skeleton h-64" />
        </div>
      )}
      {state === "error" && <div className="card-tile p-5 text-xs text-danger">Impossible de charger les cartes.</div>}

      {state === "ready" && (
        <div className="card-tile p-0 overflow-hidden">
          {TIERS.map((tier) => (
            <div
              key={tier}
              className="flex border-b border-line last:border-b-0"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDropOnTier(tier)}
            >
              <div className={`w-16 sm:w-20 shrink-0 flex items-center justify-center font-display font-bold text-xl sm:text-2xl text-black ${TIER_BAND_STYLE[tier]}`}>
                {TIER_LABEL[tier]}
              </div>
              <div className="flex-1 flex flex-wrap gap-2 p-2 bg-panel2 min-h-[80px]">
                {byTier[tier].length === 0 && <div className="text-[10px] text-steel/40 flex items-center px-2">Aucune carte</div>}
                {byTier[tier].map((c) => (
                  <div
                    key={c.cardNumber}
                    draggable
                    onDragStart={() => onDragStart(c)}
                    onClick={() => router.push(`/cards/${c.cardNumber}`)}
                    title={`${c.name} — clique pour voir la fiche, glisse pour changer de tier`}
                    className="relative cursor-grab active:cursor-grabbing rounded overflow-hidden border border-line hover:border-emerald transition-colors bg-ink shrink-0"
                    style={{ width: 52, height: 73, touchAction: "none" }}
                  >
                    <CardImage
                      src={c.imageUrl}
                      alt={c.name}
                      fallbackLabel={c.cardNumber}
                      sizes="44px"
                      fallbackTextClassName="text-[6px] font-mono text-steel/60 leading-tight line-clamp-3"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-steel/40">
        Glisse une carte d'une bande à l'autre pour corriger sa note manuellement (S=5★, A=4★, B=3★, C=2★, D=1★).
      </p>
    </div>
  );
}
