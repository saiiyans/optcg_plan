"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

/**
 * Miniature d'une carte à partir de son seul numéro (ex. "OP14-023").
 *
 * Va chercher la vraie URL d'image en base via /api/cards plutôt que de
 * la deviner (l'ancienne version construisait une URL en codant "_EN" en
 * dur — cassé pour les cartes sans version anglaise sur Limitless, comme
 * les decks starter japonais-only tels que ST32, dont seule l'image
 * "_JP" existe). Cache le résultat en mémoire (le temps de la session)
 * pour ne pas refaire la requête si la même carte apparaît plusieurs
 * fois sur un même écran (Deck Profile, Combo Lab...).
 */

const imageUrlCache = new Map<string, string | null>(); // null = confirmé sans image

async function resolveImageUrl(cardNumber: string): Promise<string | null> {
  if (imageUrlCache.has(cardNumber)) return imageUrlCache.get(cardNumber) ?? null;
  try {
    const res = await fetch(`/api/cards?q=${encodeURIComponent(cardNumber)}&limit=5`);
    const data = await res.json();
    const match = (data.cards ?? []).find((c: any) => c.cardNumber === cardNumber);
    const url = match?.imageUrl || null;
    imageUrlCache.set(cardNumber, url);
    return url;
  } catch {
    return null;
  }
}

export function CardThumb({
  cardNumber,
  size = 64,
  showLabel = true,
  quantity,
  imageUrl: providedImageUrl,
}: {
  cardNumber: string;
  size?: number;
  showLabel?: boolean;
  quantity?: number;
  /** Si l'appelant a déjà l'URL réelle (ex. Comparer, qui a déjà interrogé
   * l'API), la passer ici évite une requête réseau redondante. */
  imageUrl?: string | null;
}) {
  const height = Math.round(size * 1.4); // ratio d'une carte à jouer
  const [imageUrl, setImageUrl] = useState<string | null>(
    providedImageUrl !== undefined ? providedImageUrl : imageUrlCache.get(cardNumber) ?? null
  );
  const [loaded, setLoaded] = useState(providedImageUrl !== undefined || imageUrlCache.has(cardNumber));

  useEffect(() => {
    let cancelled = false;
    if (providedImageUrl !== undefined) return;
    if (imageUrlCache.has(cardNumber)) return;
    resolveImageUrl(cardNumber).then((url) => {
      if (!cancelled) {
        setImageUrl(url);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [cardNumber, providedImageUrl]);

  return (
    <Link
      href={`/cards/${cardNumber}`}
      className="inline-flex flex-col items-center gap-1 group shrink-0"
      title={cardNumber}
    >
      <div className="relative bg-panel2 rounded-md overflow-hidden" style={{ width: size, height }}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={cardNumber}
            width={size}
            height={height}
            className="rounded-md border border-line group-hover:border-emerald-bright transition-colors object-cover"
            style={{ width: size, height }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-center px-1 border border-line rounded-md group-hover:border-emerald-bright transition-colors">
            <span className="text-[9px] font-mono text-steel/50 leading-tight">
              {loaded ? cardNumber : "…"}
            </span>
          </div>
        )}
        {quantity !== undefined && (
          <span className="absolute top-0.5 right-0.5 bg-emerald-dim text-emerald-bright text-[9px] font-mono px-1 py-0.5 rounded leading-none">
            ×{quantity}
          </span>
        )}
      </div>
      {showLabel && <span className="text-[10px] font-mono text-steel/70">{cardNumber}</span>}
    </Link>
  );
}
