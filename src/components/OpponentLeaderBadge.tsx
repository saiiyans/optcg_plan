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

async function resolveLeaderImage(raw: string): Promise<string | null> {
  if (cache.has(raw)) return cache.get(raw) ?? null;
  const { name, cardNumber } = parseLabel(raw);

  try {
    if (cardNumber) {
      const res = await fetch(`/api/cards?q=${encodeURIComponent(cardNumber)}&limit=5&color=all`);
      const data = await res.json();
      const match = (data.cards ?? []).find((c: any) => c.cardNumber === cardNumber);
      if (match?.imageUrl) {
        cache.set(raw, match.imageUrl);
        return match.imageUrl;
      }
    }
    if (name) {
      const res = await fetch(`/api/cards?q=${encodeURIComponent(name)}&limit=10&color=all&category=Leader`);
      const data = await res.json();
      const leaderMatch = (data.cards ?? [])[0];
      const url = leaderMatch?.imageUrl ?? null;
      cache.set(raw, url);
      return url;
    }
  } catch {
    // silencieux — repli sur le texte seul
  }
  cache.set(raw, null);
  return null;
}

export function OpponentLeaderBadge({ label, size = 22, className = "" }: { label: string; size?: number; className?: string }) {
  const [imageUrl, setImageUrl] = useState<string | null>(cache.get(label) ?? null);

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
      {imageUrl && (
        <span
          className="relative inline-block rounded-full overflow-hidden shrink-0 border border-line"
          style={{ width: size, height: size }}
        >
          <Image src={imageUrl} alt="" fill className="object-cover" sizes={`${size}px`} />
        </span>
      )}
      <span>{label}</span>
    </span>
  );
}
