import { db } from "./db";

/**
 * Liste fermée des "erreurs rapides" sélectionnables dans le Journal —
 * utilisée à la fois par le formulaire de saisie et par le calcul de
 * diagnostic (pour agréger les erreurs les plus fréquentes).
 */
export const QUICK_MISTAKES = [
  "Mauvais mulligan",
  "Mauvaise gestion du DON!!",
  "Attaque dans le mauvais ordre",
  "Mauvaise protection de la main",
  "Counter gaspillé",
  "Life prise ou défendue au mauvais moment",
  "Mauvais choix de cible",
  "Effet Leader oublié",
  "Trigger oublié",
  "Lethal manqué",
  "Surdéveloppement du board",
  "Manque de pression",
  "Mauvaise lecture du matchup",
  "Carte morte en main",
  "Erreur de règle",
  "Autre",
] as const;

export interface DailyMission {
  hasData: boolean;
  // "Données insuffisantes" tant qu'il n'y a pas assez de parties pour
  // fonder un diagnostic — jamais de conclusion inventée sur un petit
  // échantillon.
  reason?: string; // pourquoi pas assez de données, si hasData=false
  opponentLeader?: string;
  sampleSize?: number;
  winrate?: number; // 0-100
  mission?: string;
  why?: string;
  technicalGoal?: string;
}

const MIN_SAMPLE_FOR_MATCHUP_MISSION = 3;

/**
 * Choisit la mission du jour selon : fréquence du matchup, winrate,
 * récence, et taille d'échantillon. Ne déclare jamais un matchup
 * "faible" sur moins de MIN_SAMPLE_FOR_MATCHUP_MISSION parties — renvoie
 * "Données insuffisantes" à la place, conformément à la règle du projet
 * de ne jamais présenter une corrélation comme une certitude.
 */
export async function computeDailyMission(myDeck?: string): Promise<DailyMission> {
  const matches = await db.match.findMany({
    where: { deletedAt: null, ...(myDeck ? { myDeck } : {}) },
    orderBy: { date: "desc" },
    take: 200, // fenêtre récente, suffisante pour un diagnostic pertinent
  });

  if (matches.length === 0) {
    return { hasData: false, reason: "Aucune partie enregistrée pour l'instant." };
  }

  // Regroupe par adversaire.
  const byOpponent = new Map<string, { total: number; wins: number; lastDate: string }>();
  for (const m of matches) {
    const key = m.opponentLeader;
    const entry = byOpponent.get(key) ?? { total: 0, wins: 0, lastDate: m.date };
    entry.total++;
    if (m.result === "Victoire") entry.wins++;
    if (m.date > entry.lastDate) entry.lastDate = m.date;
    byOpponent.set(key, entry);
  }

  // Score de priorité : fréquence × (1 - winrate) — favorise les
  // matchups à la fois courants ET difficiles, avec un échantillon
  // suffisant pour être fiable.
  let best: { leader: string; total: number; wins: number } | null = null;
  let bestScore = -1;
  for (const [leader, stats] of byOpponent) {
    if (stats.total < MIN_SAMPLE_FOR_MATCHUP_MISSION) continue;
    const winrate = stats.wins / stats.total;
    const score = stats.total * (1 - winrate);
    if (score > bestScore) {
      bestScore = score;
      best = { leader, total: stats.total, wins: stats.wins };
    }
  }

  if (!best) {
    const totalGames = matches.length;
    const uniqueOpponents = byOpponent.size;
    return {
      hasData: false,
      sampleSize: totalGames,
      reason: `${totalGames} partie(s) enregistrée(s) contre ${uniqueOpponents} adversaire(s) différent(s), mais aucun matchup n'atteint encore ${MIN_SAMPLE_FOR_MATCHUP_MISSION} parties — pas assez pour cibler un adversaire précis. Continue à enregistrer tes parties.`,
    };
  }

  const winrate = Math.round((best.wins / best.total) * 100);

  return {
    hasData: true,
    opponentLeader: best.leader,
    sampleSize: best.total,
    winrate,
    mission: `Joue ${Math.max(2, 3)} parties contre ${best.leader}.`,
    why: `Sur tes ${best.total} dernières parties contre ce leader, tu as gagné ${winrate}% (${best.wins}/${best.total}).`,
    technicalGoal: "Note ton erreur principale à chaque partie pour affiner ce diagnostic.",
  };
}

export interface WeaknessSummary {
  hasData: boolean;
  reason?: string;
  topMistake?: string;
  count?: number;
  totalWithMistake?: number;
}

const MIN_SAMPLE_FOR_MISTAKE = 3;

/** Erreur la plus fréquente parmi les parties récentes ayant une erreur renseignée. */
export async function computeTopWeakness(myDeck?: string): Promise<WeaknessSummary> {
  const matches = await db.match.findMany({
    where: { deletedAt: null, ...(myDeck ? { myDeck } : {}), mainMistake: { not: null } },
    orderBy: { date: "desc" },
    take: 200,
  });

  if (matches.length < MIN_SAMPLE_FOR_MISTAKE) {
    return {
      hasData: false,
      reason: `Seulement ${matches.length} partie(s) avec une erreur notée — pas assez pour dégager une tendance fiable.`,
    };
  }

  const counts = new Map<string, number>();
  for (const m of matches) {
    if (!m.mainMistake) continue;
    counts.set(m.mainMistake, (counts.get(m.mainMistake) ?? 0) + 1);
  }

  let top: string | null = null;
  let topCount = 0;
  for (const [mistake, count] of counts) {
    if (count > topCount) {
      top = mistake;
      topCount = count;
    }
  }

  if (!top) return { hasData: false, reason: "Données insuffisantes." };

  return { hasData: true, topMistake: top, count: topCount, totalWithMistake: matches.length };
}

export interface StrengthEntry {
  opponentLeader: string;
  winrate: number;
  sampleSize: number;
}

export interface StrengthsSummary {
  hasData: boolean;
  reason?: string;
  strengths: StrengthEntry[];
}

const MIN_SAMPLE_FOR_STRENGTH = 3;
const STRENGTH_WINRATE_THRESHOLD = 60; // %

/**
 * Jusqu'à 3 matchups où le winrate est confortable (≥60%) ET
 * l'échantillon est suffisant pour ne pas être un coup de chance —
 * jamais une seule victoire présentée comme une force acquise.
 */
export async function computeStrengths(myDeck?: string): Promise<StrengthsSummary> {
  const matches = await db.match.findMany({
    where: { deletedAt: null, ...(myDeck ? { myDeck } : {}) },
    orderBy: { date: "desc" },
    take: 200,
  });

  if (matches.length === 0) {
    return { hasData: false, reason: "Aucune partie enregistrée pour l'instant.", strengths: [] };
  }

  const byOpponent = new Map<string, { total: number; wins: number }>();
  for (const m of matches) {
    const key = m.opponentLeader;
    const entry = byOpponent.get(key) ?? { total: 0, wins: 0 };
    entry.total++;
    if (m.result === "Victoire") entry.wins++;
    byOpponent.set(key, entry);
  }

  const strengths: StrengthEntry[] = [];
  for (const [opponentLeader, stats] of byOpponent) {
    if (stats.total < MIN_SAMPLE_FOR_STRENGTH) continue;
    const winrate = Math.round((stats.wins / stats.total) * 100);
    if (winrate >= STRENGTH_WINRATE_THRESHOLD) {
      strengths.push({ opponentLeader, winrate, sampleSize: stats.total });
    }
  }
  strengths.sort((a, b) => b.winrate - a.winrate);

  if (strengths.length === 0) {
    return {
      hasData: false,
      reason: `Aucun matchup n'atteint encore ${MIN_SAMPLE_FOR_STRENGTH} parties avec ${STRENGTH_WINRATE_THRESHOLD}%+ de winrate — continue à jouer pour dégager tes points forts.`,
      strengths: [],
    };
  }

  return { hasData: true, strengths: strengths.slice(0, 3) };
}

export interface ProgressSummary {
  hasData: boolean;
  reason?: string;
  recentWinrate?: number;
  previousWinrate?: number;
  delta?: number; // points de %, positif = progression
  recentSample?: number;
  previousSample?: number;
}

const PROGRESS_WINDOW = 10;

/**
 * Compare le winrate des PROGRESS_WINDOW dernières parties à celui des
 * PROGRESS_WINDOW précédentes — jamais présenté comme une tendance
 * garantie, juste une observation sur un échantillon encore petit.
 */
export async function computeRecentProgress(myDeck?: string): Promise<ProgressSummary> {
  const matches = await db.match.findMany({
    where: { deletedAt: null, ...(myDeck ? { myDeck } : {}) },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: PROGRESS_WINDOW * 2,
  });

  if (matches.length < PROGRESS_WINDOW + 3) {
    return {
      hasData: false,
      reason: `${matches.length} partie(s) enregistrée(s) — il en faut au moins ${PROGRESS_WINDOW + 3} pour comparer deux périodes de façon fiable.`,
    };
  }

  const recent = matches.slice(0, PROGRESS_WINDOW);
  const previous = matches.slice(PROGRESS_WINDOW);

  const winrateOf = (list: typeof matches) =>
    list.length ? Math.round((list.filter((m) => m.result === "Victoire").length / list.length) * 100) : 0;

  const recentWinrate = winrateOf(recent);
  const previousWinrate = winrateOf(previous);

  return {
    hasData: true,
    recentWinrate,
    previousWinrate,
    delta: recentWinrate - previousWinrate,
    recentSample: recent.length,
    previousSample: previous.length,
  };
}
