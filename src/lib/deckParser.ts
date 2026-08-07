/**
 * Parseur pour le format compact utilisé par onepiecetopdecks.com :
 *   "1nOP14-020a4nEB01-015a4nOP12-034a...a1nOP14-039"
 * Chaque entrée est {quantité}n{numéroCarte}, séparée par "a". La première
 * entrée est toujours le Leader (quantité 1).
 *
 * N'invente jamais une quantité manquante : si le total ne tombe pas
 * exactement sur 50 cartes hors Leader, la liste est marquée
 * "needs_review" plutôt que corrigée automatiquement.
 */

export interface ParsedDeckEntry {
  cardNumber: string;
  quantity: number;
}

export interface ParsedDeck {
  leader: ParsedDeckEntry | null;
  cards: ParsedDeckEntry[];
  totalNonLeader: number;
  valid: boolean; // exactement 1 leader + exactement 50 cartes, qty max 4
  errors: string[];
}

export function parseCompactDecklist(raw: string): ParsedDeck {
  const errors: string[] = [];
  const tokens = raw.split("a").filter(Boolean);
  const entries: ParsedDeckEntry[] = [];

  for (const token of tokens) {
    const m = token.match(/^(\d+)n([A-Z0-9-]+)$/i);
    if (!m) {
      errors.push(`Token illisible : "${token}"`);
      continue;
    }
    entries.push({ quantity: parseInt(m[1], 10), cardNumber: m[2].toUpperCase() });
  }

  const leader = entries[0] ?? null;
  const cards = entries.slice(1);
  const totalNonLeader = cards.reduce((sum, c) => sum + c.quantity, 0);

  if (!leader) errors.push("Aucun Leader détecté");
  if (leader && leader.quantity !== 1) errors.push(`Le Leader a une quantité de ${leader.quantity} au lieu de 1`);
  if (totalNonLeader !== 50) errors.push(`Total hors Leader = ${totalNonLeader} au lieu de 50`);
  for (const c of cards) {
    if (c.quantity > 4) errors.push(`${c.cardNumber} a ${c.quantity} exemplaires (max 4)`);
  }

  return {
    leader,
    cards,
    totalNonLeader,
    valid: errors.length === 0,
    errors,
  };
}

export interface PlacementInfo {
  wins: number | null;
  losses: number | null;
  undefeated: boolean;
  status: "winner" | "top_performer" | "unverified";
  proofLevel: "gold" | "silver" | "bronze" | null;
}

/**
 * Classe un placement brut ("1st (8-1)", "T4 (4-1)", "2nd Place", "NA (5-1)"...).
 * Règle stricte reprise du cahier des charges :
 * - "winner" uniquement si le placement commence par "1st"
 * - "top_performer" pour Top 4 / Top 8 / T\d+ / 2nd / 3rd / 4th
 * - tout le reste (NA, résultats ambigus) -> "unverified"
 * Ne mélange jamais les deux : un Top 4 n'est jamais compté comme gagnant.
 */
export function classifyPlacement(placementRaw: string): PlacementInfo {
  const recordMatch = placementRaw.match(/\((\d+)-(\d+)\)/);
  const wins = recordMatch ? parseInt(recordMatch[1], 10) : null;
  const losses = recordMatch ? parseInt(recordMatch[2], 10) : null;
  const undefeated = losses !== null && losses === 0 && (wins ?? 0) > 0;

  const isFirst = /^1st\b/i.test(placementRaw.trim());
  const isTopCut = /^(top\s?\d+|t\d+|2nd|3rd|4th)\b/i.test(placementRaw.trim());

  let status: PlacementInfo["status"] = "unverified";
  let proofLevel: PlacementInfo["proofLevel"] = null;

  if (isFirst) {
    status = "winner";
    proofLevel = "gold";
  } else if (isTopCut) {
    status = "top_performer";
    // Top 4 / Top 8 -> argent ; au-delà (T16+) reste "top_performer" mais bronze
    const topNum = placementRaw.match(/(?:top\s?|t)(\d+)/i);
    proofLevel = topNum && parseInt(topNum[1], 10) <= 8 ? "silver" : "bronze";
  } else if (wins !== null) {
    // résultat positif (ex: "NA (5-1)") sans classement clair -> bronze si plus de victoires que de défaites
    status = "unverified";
    proofLevel = wins > (losses ?? 0) ? "bronze" : null;
  }

  return { wins, losses, undefeated, status, proofLevel };
}

/** Extrait un nombre de participants depuis un host du type "Girafull(58)". */
export function extractParticipants(host: string): number | null {
  const m = host.match(/\((\d+)\)/);
  return m ? parseInt(m[1], 10) : null;
}

/** Construit la clé unique anti-doublon décrite dans le cahier des charges. */
export function buildDeckUniqueKey(params: {
  leaderCardNumber: string;
  player: string;
  date: string;
  tournamentType: string;
  host: string;
  placementRaw: string;
}): string {
  return [params.leaderCardNumber, params.player, params.date, params.tournamentType, params.host, params.placementRaw]
    .join("|")
    .toLowerCase();
}
