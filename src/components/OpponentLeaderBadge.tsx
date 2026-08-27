"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

/**
 * Résout et affiche la miniature d'un leader adverse à partir de son
 * libellé texte tel que stocké dans l'app — sous des formats variés :
 *   "Rocks D. Xebec (OP17-039)"  -> numéro de carte exact, résolution directe
 *   "Luffy Noir (OP17)"          -> set seulement, recherche par nom
 *   "Purple Enel"                -> couleur en préfixe, recherche par nom
 *   "Roronoa Zoro (OP12-020)"    -> numéro de carte exact
 *
 * Cherche dans /api/cards (toutes couleurs) une carte de catégorie Leader
 * correspondante. Si rien n'est trouvé (carte pas encore importée), affiche
 * juste le texte — jamais d'erreur, jamais de blocage.
 */

const cache = new Map<string, string | null>();
// Une seule requête en vol par label : plusieurs badges affichant le même
// adversaire (très fréquent sur /matchup-center où un même leader revient
// dans plusieurs entrées) partagent désormais la même promesse au lieu de
// déclencher chacun leur propre fetch("/api/cards") en parallèle. Avant ce
// correctif, N badges identiques montés en même temps = N requêtes
// concurrentes identiques, ce qui pouvait épuiser le pool de connexions
// Postgres (Neon) sous charge et faire échouer certaines d'entre elles.
const inFlight = new Map<string, Promise<string | null>>();

const COLOR_WORDS = ["Red", "Blue", "Purple", "Black", "Yellow", "Green"];
const COLOR_PREFIX_RE = new RegExp(`^(${COLOR_WORDS.join("|")})(/(${COLOR_WORDS.join("|")}))*\\s+`, "i");

function parseLabel(raw: string): { name: string; cardNumber: string | null } {
  const m = raw.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (m) {
    const [, name, paren] = m;
    const isCardNumber = /^[A-Z]+\d+-\d+$/i.test(paren.trim());
    return { name: name.replace(COLOR_PREFIX_RE, "").trim(), cardNumber: isCardNumber ? paren.trim().toUpperCase() : null };
  }
  return { name: raw.replace(COLOR_PREFIX_RE, "").trim(), cardNumber: null };
}

async function fetchLeaderImage(raw: string): Promise<string | null> {
  const { name, cardNumber } = parseLabel(raw);

  if (cardNumber) {
    const res = await fetch(`/api/cards?q=${encodeURIComponent(cardNumber)}&limit=5&color=all`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const match = (data.cards ?? []).find((c: any) => c.cardNumber === cardNumber);
    if (match?.imageUrl) return match.imageUrl;
  }
  if (name) {
    const res = await fetch(`/api/cards?q=${encodeURIComponent(name)}&limit=10&color=all&category=Leader`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const leaderMatch = (data.cards ?? [])[0];
    return leaderMatch?.imageUrl ?? null;
  }
  return null;
}

async function resolveLeaderImage(raw: string): Promise<string | null> {
  if (cache.has(raw)) return cache.get(raw) ?? null;

  const existing = inFlight.get(raw);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const url = await fetchLeaderImage(raw);
      // Résultat définitif (trouvé ou vraiment absent de la base) : on peut
      // le mettre en cache pour de bon.
      cache.set(raw, url);
      return url;
    } catch {
      // Échec réseau/serveur (timeout, pool de connexions saturé, etc.) :
      // ce n'est PAS la preuve que l'image n'existe pas, donc on ne "blackliste"
      // jamais ce label — un futur montage du badge retentera l'appel au lieu
      // de rester bloqué sur un rond vide pour le reste de la session.
      return null;
    } finally {
      inFlight.delete(raw);
    }
  })();
  inFlight.set(raw, promise);
  return promise;
}

export function OpponentLeaderBadge({ label, size = 22, className = "" }: { label: string; size?: number; className?: string }) {
  const [imageUrl, setImageUrl] = useState<string | null>(cache.get(label) ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (cache.has(label)) return;
    resolveLeaderImage(label).then((url) => {
      if (!cancelled) setImageUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [label]);

  return (
    <span className={`inline-flex items-center gap-1.5 align-middle ${className}`}>
      {imageUrl && !failed && (
        <span
          className="relative inline-block rounded-full overflow-hidden shrink-0 border border-line"
          style={{ width: size, height: size }}
        >
          <Image src={imageUrl} alt="" fill className="object-cover" sizes={`${size}px`} onError={() => setFailed(true)} />
        </span>
      )}
      <span>{label}</span>
    </span>
  );
}
