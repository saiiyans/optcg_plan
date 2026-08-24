"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * Wrapper autour de next/image pour toute vignette de carte, avec repli
 * sûr en cas d'échec de chargement.
 *
 * Bug corrigé : partout ailleurs dans l'app, un <Image fill .../> sans
 * onError laissait le navigateur afficher son rendu natif d'image cassée
 * (petite icône + texte alt qui déborde du cadre, casse la grille) dès
 * qu'une image renvoyait une 404 — visible sur les leaders/decks sans
 * image encore importée. CardTile.tsx avait déjà le bon réflexe
 * (état imgFailed + repli centré) ; ce composant généralise ce même
 * réflexe à tous les autres endroits qui affichent une image de carte,
 * pour qu'un échec de chargement reste toujours contenu dans son cadre.
 *
 * `fallbackLabel` : texte affiché si l'image manque ou casse (numéro de
 * carte de préférence — plus lisible qu'un nom tronqué dans un petit
 * cadre). Retombe sur `alt` si non fourni.
 */
export function CardImage({
  src,
  alt,
  fallbackLabel,
  sizes = "140px",
  className = "object-cover",
  unoptimized,
  loading,
  fallbackClassName = "w-full h-full flex items-center justify-center text-center px-1 overflow-hidden",
  fallbackTextClassName = "text-[10px] font-mono text-steel/50 leading-tight line-clamp-3",
}: {
  src: string | null | undefined;
  alt: string;
  fallbackLabel?: string;
  sizes?: string;
  className?: string;
  unoptimized?: boolean;
  loading?: "lazy" | "eager";
  fallbackClassName?: string;
  fallbackTextClassName?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={fallbackClassName}>
        <span className={fallbackTextClassName}>{fallbackLabel ?? alt}</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      loading={loading}
      className={className}
      unoptimized={unoptimized ?? src.includes("spellmana.com")}
      onError={() => setFailed(true)}
    />
  );
}
