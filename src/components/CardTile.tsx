"use client";
import { useState } from "react";
import Image from "next/image";
import { StarRating } from "./StarRating";

export interface CardTileData {
  cardNumber: string;
  name: string;
  category: string;
  cost: number | null;
  power?: number | null;
  counter: number | null;
  setCode: string;
  imageUrl: string;
  isLeak?: boolean;
  legalityStatus: string | null;
  deckQuantity: number;
  rating: { stars: number; confidence: string } | null;
}

export function CardTile({ card, onSelect }: { card: CardTileData; onSelect: (n: string) => void }) {
  const legal = !card.legalityStatus || !card.legalityStatus.toLowerCase().includes("illegal");
  const [imgFailed, setImgFailed] = useState(false);
  return (
    <button
      onClick={() => onSelect(card.cardNumber)}
      className="card-tile p-3 text-left flex flex-col gap-2 hover:-translate-y-0.5 group"
    >
      {/* Image seule, jamais recouverte d'informations */}
      <div className="relative w-full aspect-[5/7] bg-panel2 rounded-lg overflow-hidden">
        {card.imageUrl && !imgFailed ? (
          <Image
            src={card.imageUrl}
            alt={card.name}
            fill
            loading="lazy"
            sizes="240px"
            // spellmana.com (source des cartes OP17 leak) bloque les
            // requêtes serveur-à-serveur de l'optimiseur d'images de
            // Vercel tout en autorisant les requêtes directes du
            // navigateur — on contourne donc l'optimisation pour ce
            // domaine précis plutôt que de laisser l'image casser.
            unoptimized={card.imageUrl.includes("spellmana.com")}
            className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            // Si l'image échoue à charger (coupure réseau ponctuelle,
            // fréquente sur tablette), afficher un repli visuel plutôt
            // qu'un espace vide silencieux qu'on pourrait croire cassé.
            onError={() => setImgFailed(true)}
          />
        ) : card.imageUrl && imgFailed ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-center px-2 gap-1">
            <span className="text-[10px] font-mono text-steel/50">{card.cardNumber}</span>
            <span className="text-[9px] text-steel/40">Image indisponible</span>
          </div>
        ) : null}
      </div>

      {/* Identité */}
      <div className="min-w-0">
        <div className="text-[15px] text-ivory font-medium leading-snug truncate">{card.name}</div>
        <div className="text-xs font-mono text-textMuted">{card.cardNumber} · {card.setCode}</div>
      </div>

      {/* Statistiques */}
      <div className="flex items-center gap-2.5 text-xs text-steel">
        <span>Cost {card.cost ?? "—"}</span>
        {card.power != null && <span>{card.power} Pwr</span>}
        {card.counter ? <span>+{card.counter} Ctr</span> : null}
      </div>

      {card.rating && <StarRating stars={card.rating.stars} compact />}

      {/* Badges — sous l'image, jamais dessus */}
      <div className="flex flex-wrap gap-1.5 pt-0.5">
        <span className={`badge ${legal ? "badge-green" : "badge-red"}`}>{legal ? "Legal" : "Illegal"}</span>
        {card.isLeak && <span className="badge badge-gold">LEAK</span>}
        {card.deckQuantity > 0 && <span className="badge badge-green">In My Deck ×{card.deckQuantity}</span>}
      </div>
    </button>
  );
}
