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
      title={`${card.name} — ${card.cardNumber}`}
      // Tuile "image seule" relevée à l'identique sur
      // nakamacompanion.com/collection : pas de panneau ni de légende texte
      // sous la carte (nom/coût/counter sont déjà imprimés sur l'image),
      // pas d'animation au survol — le nom complet reste accessible via le
      // titre au survol et, en un clic, sur la fiche détaillée qui garde
      // toutes les infos (note, badges, tags).
      className="cgi-tile text-left"
    >
      {card.imageUrl && !imgFailed ? (
        <Image
          src={card.imageUrl}
          alt={card.name}
          fill
          loading="lazy"
          sizes="180px"
          // spellmana.com (source des cartes OP17 leak) bloque les
          // requêtes serveur-à-serveur de l'optimiseur d'images de
          // Vercel tout en autorisant les requêtes directes du
          // navigateur — on contourne donc l'optimisation pour ce
          // domaine précis plutôt que de laisser l'image casser.
          unoptimized={card.imageUrl.includes("spellmana.com")}
          className="object-cover"
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

      {/* Badges — coin de l'image, jamais de bloc à part sous la carte
          (données coach propres à l'app, absentes de l'image imprimée). */}
      {card.deckQuantity > 0 && (
        <span className="cgi-badge" style={{ background: "#66BB6A" }}>
          ×{card.deckQuantity}
        </span>
      )}
      {card.isLeak && (
        <span className="cgi-badge" style={{ background: "#FFEE58", color: "#111", top: card.deckQuantity > 0 ? 30 : 6 }}>
          LEAK
        </span>
      )}
      {!legal && (
        <span className="cgi-badge" style={{ background: "#EF5350" }}>
          Illegal
        </span>
      )}

      {card.rating && (
        <div className="absolute bottom-0 inset-x-0 px-1.5 py-1 bg-gradient-to-t from-black/80 to-transparent">
          <StarRating stars={card.rating.stars} compact />
        </div>
      )}
    </button>
  );
}
