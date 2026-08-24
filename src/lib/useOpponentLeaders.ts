"use client";

import { useEffect, useState } from "react";
import { OPPONENT_LEADERS } from "@/lib/planningData";

// Cache mémoire au niveau du module — un seul appel réseau par session,
// même si le hook est monté sur plusieurs écrans (Journal, Prépa...).
let cached: string[] | null = null;

/**
 * Liste des leaders adverses pour l'autocomplétion (Journal, Prépa...).
 *
 * Combine la liste statique OPPONENT_LEADERS (repli instantané, toujours
 * disponible même hors-ligne) avec /api/leaders (liste réelle tirée de la
 * bibliothèque de cartes importée). Les deux sont fusionnées et
 * dédupliquées — jamais l'une remplaçant l'autre — pour ne perdre aucun nom
 * si l'API échoue temporairement ou si la base n'a pas encore fini
 * d'importer le dernier set.
 */
export function useOpponentLeaders(): string[] {
  const [leaders, setLeaders] = useState<string[]>(cached ?? OPPONENT_LEADERS);

  useEffect(() => {
    if (cached) return;
    let cancelled = false;
    fetch("/api/leaders")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d.ok || !Array.isArray(d.leaders) || d.leaders.length === 0) return;
        const merged = Array.from(new Set([...d.leaders, ...OPPONENT_LEADERS])).sort((a, b) =>
          a.localeCompare(b, "fr")
        );
        cached = merged;
        setLeaders(merged);
      })
      .catch(() => {
        // silencieux — la liste statique reste utilisée, jamais d'erreur bloquante
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return leaders;
}
