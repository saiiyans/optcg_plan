"use client";
import { useEffect, useState } from "react";
import Image from "next/image";

// Cache mémoire au niveau du module — partagé par tous les composants de la
// page, pour ne récupérer l'image de chaque leader qu'une seule fois par
// session plutôt qu'à chaque affichage du badge.
const cache = new Map<string, string | null>();

export function LeaderImage({ leaderKey, size = 28 }: { leaderKey: string; size?: number }) {
  const [imageUrl, setImageUrl] = useState<string | null>(cache.get(leaderKey) ?? null);
  const [loaded, setLoaded] = useState(cache.has(leaderKey));

  useEffect(() => {
    if (cache.has(leaderKey)) return;
    fetch(`/api/leader-image?leader=${leaderKey}`)
      .then((r) => r.json())
      .then((d) => {
        const url = d.ok ? d.imageUrl : null;
        cache.set(leaderKey, url);
        setImageUrl(url);
        setLoaded(true);
      })
      .catch(() => {
        cache.set(leaderKey, null);
        setLoaded(true);
      });
  }, [leaderKey]);

  if (!imageUrl) return null; // pas d'espace réservé tant qu'on n'a pas confirmé l'image — le texte à côté suffit en attendant

  return (
    <span
      className="relative inline-block rounded-full overflow-hidden shrink-0 border border-line align-middle"
      style={{ width: size, height: size }}
    >
      <Image src={imageUrl} alt="" fill className="object-cover" sizes={`${size}px`} />
    </span>
  );
}
