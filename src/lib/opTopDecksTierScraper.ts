import { scrapeTournamentDeckTable } from "@/lib/scraper";
import { db } from "@/lib/db";
import { tierByRankPercentile, type TierLetter } from "@/lib/tierBucketing";
import { parseCompactDecklist } from "@/lib/deckParser";

/**
 * Tier list "méta" calculée EN DIRECT à partir de la page de decklists
 * onepiecetopdecks.com (même mécanisme de scraping que /api/tournament-decks
 * — voir src/lib/scraper.ts, scrapeTournamentDeckTable). Remplace l'ancien
 * instantané figé (src/lib/data/onepiecetopdecks-tiers.json, capturé à la
 * main le 11/08/2026) : ici chaque clic sur "Actualiser" relit vraiment le
 * site et recalcule le classement du jour.
 *
 * IMPORTANT — lien à mettre à jour à la sortie d'un nouveau format, comme
 * DEFAULT_URL dans src/app/api/tournament-decks/sync/route.ts (même
 * pratique, volontairement pas automatisée pour rester lisible).
 */
export const OPTOPDECKS_URL =
  "https://onepiecetopdecks.com/deck-list/english-op17-deck-list-the-worlds-strongest-warriors/";
export const OPTOPDECKS_FORMAT_LABEL = "OP17 — The World's Strongest Warriors";
export const OPTOPDECKS_SOURCE_LABEL = "onepiecetopdecks.com — page de decklists OP17 (anglais)";

export interface OpTopDecksTierEntry {
  cardNumber: string | null; // null si le leader n'a pas pu être identifié précisément (profil texte seul)
  displayName: string;
  color: string | null;
  deckCount: number;
  tier: TierLetter;
}

export interface OpTopDecksTierResult {
  entries: OpTopDecksTierEntry[];
  totalDecksScanned: number;
  distinctLeaders: number;
  sourceUrl: string;
  sourceLabel: string;
  formatLabel: string;
  capturedAt: string; // ISO, calculé à l'instant du scraping (pas stocké à l'avance)
}

// Voir la note dans deckComposition.ts : le typage local explicite est requis
// à cause du client Prisma cassé dans ce bac à sable (db.card.findMany
// résoudrait sinon en `any` nu, ce qui casse l'inférence de .map/.filter
// ensuite) — safe et toujours correct une fois buildé sur Vercel.
interface CardNameColorRow {
  cardNumber: string;
  name: string;
  color: string;
}

/**
 * Extrait le numéro de carte du Leader depuis le format compact de la
 * colonne "Deck Composition" (ex: "1nOP14-020a4nEB01-015a..." → OP14-020).
 *
 * BUG CORRIGÉ (30/08/2026) : la version précédente utilisait sa propre
 * regex `/^1n([A-Z0-9-]+)a/i` — sous le flag /i, le "a" de fin ET le "n"
 * séparateur des entrées suivantes appartiennent TOUS DEUX à la classe
 * [A-Z0-9-] (équivalents insensibles à la casse de "A" et "N"), donc le "+"
 * gourmand engloutissait tout le reste du decklist et ne backtrackait que
 * jusqu'au DERNIER "a" de la chaîne entière — capturant un fatras du genre
 * "OP17-039A4NOP08-051A4NOP17-..." au lieu de "OP17-039" pour la plupart
 * des decks. Reprend maintenant parseCompactDecklist (deckParser.ts), qui
 * découpe d'abord la chaîne sur "a" en tokens isolés avant de matcher
 * chacun avec `^...$` — sans cette ambiguïté, déjà testé/utilisé ailleurs.
 */
function extractLeaderCardNumber(rawDecklist: string): string | null {
  return parseCompactDecklist(rawDecklist).leader?.cardNumber ?? null;
}

export async function fetchOpTopDecksTierList(): Promise<OpTopDecksTierResult> {
  const rows = await scrapeTournamentDeckTable(OPTOPDECKS_URL);
  if (rows.length === 0) {
    throw new Error(
      "Aucune ligne de decklist exploitable trouvée sur la page source — le site a peut-être changé de structure, ou n'a pas encore de données pour ce format."
    );
  }

  // Regroupe par leader (numéro de carte quand identifiable, sinon par
  // "Deck Profile" texte brut — ex: profils très récents pas encore mappés
  // à une carte dans notre base, jamais devinés).
  const counts = new Map<string, { count: number; deckProfile: string; deckColorRaw: string; cardNumber: string | null }>();
  for (const row of rows) {
    const cardNumber = extractLeaderCardNumber(row.rawDecklist);
    const key = cardNumber || `PROFILE:${row.deckProfile.trim().toLowerCase()}`;
    const existing = counts.get(key);
    if (existing) {
      existing.count++;
    } else {
      counts.set(key, { count: 1, deckProfile: row.deckProfile, deckColorRaw: row.deckColor, cardNumber });
    }
  }

  const knownNumbers = Array.from(counts.values())
    .map((v) => v.cardNumber)
    .filter((n): n is string => !!n);
  const cardRows: CardNameColorRow[] =
    knownNumbers.length > 0
      ? await db.card.findMany({
          where: { cardNumber: { in: knownNumbers } },
          select: { cardNumber: true, name: true, color: true },
        })
      : [];
  const cardByNumber = new Map(cardRows.map((c) => [c.cardNumber, c]));

  const sorted = Array.from(counts.entries())
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => b.count - a.count);

  const tierMap = tierByRankPercentile(sorted);

  const entries: OpTopDecksTierEntry[] = sorted.map((v) => {
    const known = v.cardNumber ? cardByNumber.get(v.cardNumber) : undefined;
    return {
      cardNumber: v.cardNumber,
      displayName: known?.name ?? (v.cardNumber ? `${v.deckProfile} (${v.cardNumber}, à vérifier)` : `${v.deckProfile} (à vérifier)`),
      color: known?.color ?? v.deckColorRaw ?? null,
      deckCount: v.count,
      tier: tierMap.get(v) ?? "D",
    };
  });

  return {
    entries,
    totalDecksScanned: rows.length,
    distinctLeaders: entries.length,
    sourceUrl: OPTOPDECKS_URL,
    sourceLabel: OPTOPDECKS_SOURCE_LABEL,
    formatLabel: OPTOPDECKS_FORMAT_LABEL,
    capturedAt: new Date().toISOString(),
  };
}
