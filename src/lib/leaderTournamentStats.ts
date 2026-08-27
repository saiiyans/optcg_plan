import { db } from "./db";
import { LEADERS, getLeader } from "./leaders";

export interface LeaderTournamentStats {
  usageCount: number;
  totalWinningDecks: number;
  usageRate: number;
  avgQuantity: number | null;
  minQuantity: number | null;
  maxQuantity: number | null;
  modeQuantity: number | null;
  undefeatedCount: number;
  firstWinDate: string | null;
  lastWinDate: string | null;
  countries: string[];
  tournamentTypes: string[];
  badge: "Winner" | "Undefeated" | "Staple" | "Popular" | "Tech" | "No Winning Data";
  proofLevel: "gold" | "silver" | "bronze" | null;
}

/**
 * Calcule, à partir des TournamentDeck déjà importés en base, les
 * statistiques réelles d'une carte dans les listes GAGNANTES (status =
 * "winner") d'un leader donné ("mihawk"). Rien n'est jamais
 * inventé : une carte absente des decks importés retourne usageCount=0 et
 * le badge "No Winning Data", jamais une estimation.
 */
export async function computeLeaderTournamentStats(cardNumber: string, leaderKey: string): Promise<LeaderTournamentStats> {
  const leader = getLeader(leaderKey);

  const winningDecks = await db.tournamentDeck.findMany({
    where: { deckProfile: leader.deckProfile, status: "winner" },
    include: { cards: true },
  });
  const allDecksForLeader = await db.tournamentDeck.findMany({
    where: { deckProfile: leader.deckProfile },
    include: { cards: true },
  });

  const totalWinningDecks = winningDecks.length;
  const decksWithCard = winningDecks.filter((d) => d.cards.some((c) => c.cardNumber === cardNumber));
  const usageCount = decksWithCard.length;
  const usageRate = totalWinningDecks > 0 ? Math.round((usageCount / totalWinningDecks) * 1000) / 10 : 0;

  const quantities = decksWithCard
    .map((d) => d.cards.find((c) => c.cardNumber === cardNumber)?.quantity)
    .filter((q): q is number => q !== undefined);

  const avgQuantity = quantities.length ? Math.round((quantities.reduce((a, b) => a + b, 0) / quantities.length) * 10) / 10 : null;
  const minQuantity = quantities.length ? Math.min(...quantities) : null;
  const maxQuantity = quantities.length ? Math.max(...quantities) : null;
  const modeQuantity = quantities.length ? mode(quantities) : null;

  const undefeatedCount = decksWithCard.filter((d) => d.undefeated).length;

  const dates = decksWithCard.map((d) => d.date).filter(Boolean);
  const countries = Array.from(new Set(decksWithCard.map((d) => d.country).filter(Boolean)));
  const tournamentTypes = Array.from(new Set(decksWithCard.map((d) => d.tournamentType).filter(Boolean)));

  const decksWithCardAnyStatus = allDecksForLeader.filter((d) => d.cards.some((c) => c.cardNumber === cardNumber));
  const proofLevel = bestProofLevel(decksWithCardAnyStatus.map((d) => d.proofLevel));

  let badge: LeaderTournamentStats["badge"] = "No Winning Data";
  if (usageCount > 0) {
    if (undefeatedCount > 0) badge = "Undefeated";
    else if (usageRate >= 75) badge = "Staple";
    else if (usageRate >= 40) badge = "Popular";
    else badge = "Tech";
  }

  return {
    usageCount,
    totalWinningDecks,
    usageRate,
    avgQuantity,
    minQuantity,
    maxQuantity,
    modeQuantity,
    undefeatedCount,
    firstWinDate: dates.length ? dates[dates.length - 1] : null,
    lastWinDate: dates.length ? dates[0] : null,
    countries,
    tournamentTypes,
    badge,
    proofLevel,
  };
}

function mode(nums: number[]): number {
  const counts = new Map<number, number>();
  for (const n of nums) counts.set(n, (counts.get(n) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function bestProofLevel(levels: (string | null)[]): "gold" | "silver" | "bronze" | null {
  if (levels.includes("gold")) return "gold";
  if (levels.includes("silver")) return "silver";
  if (levels.includes("bronze")) return "bronze";
  return null;
}
