"use client";
import { useEffect, useState } from "react";
import Image from "next/image";

// Cache mémoire au niveau du module — partagé par tous les composants de la
// page, pour ne récupérer l'image de chaque leader qu'une seule fois par
// session plutôt qu'à chaque affichage du badge.
const cache = new Map<string, string | null>();
// Une seule requête en vol par leaderKey : évite que plusieurs <LeaderImage>
// du même leader montés en même temps (nav + en-tête + carte, etc.) ne
// déclenchent chacun leur propre fetch en parallèle.
const inFlight = new Map<string, Promise<string | null>>();

export function LeaderImage({ leaderKey, size = 28 }: { leaderKey: string; size?: number }) {
  const [imageUrl, setImageUrl] = useState<string | null>(cache.get(leaderKey) ?? null);
  const [loaded, setLoaded] = useState(cache.has(leaderKey));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (cache.has(leaderKey)) return;

    let promise = inFlight.get(leaderKey);
    if (!promise) {
      promise = fetch(`/api/leader-image?leader=${leaderKey}`)
        .then((r) => r.json())
        .then((d) => {
          const url = d.ok ? d.imageUrl : null;
          // Résultat définitif renvoyé par l'API (trouvé ou vraiment absent) :
          // on peut le mettre en cache pour de bon.
          cache.set(leaderKey, url);
          return url as string | null;
        })
        .catch(() => {
          // Échec réseau/serveur : on ne "blackliste" jamais le leader sur un
          // simple problème transitoire — un futur montage retentera l'appel
          // au lieu de rester bloqué sans image pour le reste de la session.
          return null;
        })
        .finally(() => {
          inFlight.delete(leaderKey);
        });
      inFlight.set(leaderKey, promise);
    }

    promise.then((url) => {
      if (!cancelled) {
        setImageUrl(url);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [leaderKey]);

  if (!imageUrl || failed) return null; // pas d'espace réservé tant qu'on n'a pas confirmé l'image — le texte à côté suffit en attendant

  return (
    <span
      className="relative inline-block rounded-full overflow-hidden shrink-0 border border-line align-middle"
      style={{ width: size, height: size }}
    >
      <Image src={imageUrl} alt="" fill className="object-cover" sizes={`${size}px`} onError={() => setFailed(true)} />
    </span>
  );
}
