// --- Entraînement officiel (section 1/2/3/21) — moteur pur, sans accès
// base de données, pour rester testable avec `tsx` sans Prisma Client.
// Toute la logique de "jour", de série et de quota quotidien vit ici ;
// les routes API et les composants ne font qu'appeler ces fonctions.
//
// Fuseau horaire de référence : Asia/Bangkok (UTC+7 fixe, pas d'heure
// d'été). Le serveur (Vercel) tourne en UTC, le navigateur peut être
// n'importe où : "aujourd'hui" doit toujours désigner le même jour civil
// pour le joueur, donc on calcule explicitement en UTC+7 plutôt que de
// faire confiance à `Intl`/au fuseau local.
//
// IMPORTANT : Match.date est une chaîne "yyyy-mm-dd" saisie/choisie par
// le joueur (pas un timestamp) — la conversion Bangkok sert à déterminer
// QUEL jour civil "aujourd'hui" désigne au moment de l'appel, pas à
// re-convertir les dates déjà enregistrées.

// DAILY_GOAL vit maintenant dans config.ts (source unique de configuration
// pour toute l'app) — réimporté puis réexporté ici pour ne rien casser des
// imports existants (`import { DAILY_GOAL } from "./trainingPhase"`), y
// compris dans scripts/test-training-phase.ts.
import { DAILY_GOAL, WEEKLY_GOAL } from "./config";
export { DAILY_GOAL, WEEKLY_GOAL };

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Date civile (yyyy-mm-dd) en Asia/Bangkok pour l'instant donné (par défaut : maintenant). */
export function bangkokDateString(at: Date = new Date()): string {
  const shifted = new Date(at.getTime() + BANGKOK_OFFSET_MS);
  return shifted.toISOString().slice(0, 10);
}

function toUtcMidnight(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00Z");
}

export function addDaysToDateString(dateStr: string, days: number): string {
  const d = toUtcMidnight(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function previousDateString(dateStr: string): string {
  return addDaysToDateString(dateStr, -1);
}

/** Nombre de jours entre deux dates civiles (b - a), peut être négatif. */
export function daysBetweenDateStrings(a: string, b: string): number {
  return Math.round((toUtcMidnight(b).getTime() - toUtcMidnight(a).getTime()) / 86400000);
}

/** Lundi de la semaine ISO contenant dateStr. */
export function mondayOfWeek(dateStr: string): string {
  const d = toUtcMidnight(dateStr);
  const dow = d.getUTCDay(); // 0 = dimanche ... 6 = samedi
  const offsetFromMonday = (dow + 6) % 7; // lundi = 0
  return addDaysToDateString(dateStr, -offsetFromMonday);
}

export type DailyColor = "gray" | "orange" | "green" | "gold" | "red";

/**
 * Couleur du compteur pour un jour donné. `isPast` = true pour un jour déjà
 * terminé (ex. hier dans l'historique) : c'est le SEUL cas où "rouge"
 * (objectif manqué) peut apparaître — un jour en cours n'est jamais rouge,
 * seulement gris/orange/vert/or (section 3).
 */
export function dailyColor(games: number, isPast: boolean): DailyColor {
  if (isPast) return games >= DAILY_GOAL ? (games > DAILY_GOAL ? "gold" : "green") : "red";
  if (games <= 0) return "gray";
  if (games < DAILY_GOAL) return "orange";
  return games > DAILY_GOAL ? "gold" : "green";
}

export interface DailyProgressInput {
  /** Une entrée par partie officielle (trainingPhase === "official_training"), sa date "yyyy-mm-dd". */
  matchDates: string[];
  /** Date de début de l'entraînement officiel (AppSettings.officialTrainingStartDate), si réglée. */
  officialTrainingStartDate?: string | null;
  /** Date du tournoi, ISO. */
  tournamentDate?: string;
  /** Point de référence "maintenant", injectable pour les tests. */
  now?: Date;
}

export interface WeekProgress {
  startDate: string; // lundi
  gamesThisWeek: number;
  weeklyGoal: number; // toujours DAILY_GOAL × 7 = 28, jamais un autre chiffre (voir config.ts)
  remainingThisWeek: number;
  goalMetThisWeek: boolean;
  daysWithGoalMetThisWeek: number;
}

export interface DailyProgressResult {
  today: string;
  dailyGoal: number;
  gamesToday: number;
  remainingToday: number;
  surplusToday: number;
  goalMetToday: boolean;
  goalExceededToday: boolean;
  colorToday: DailyColor;

  yesterday: string;
  gamesYesterday: number;
  goalMetYesterday: boolean;

  currentStreak: number;
  bestStreak: number;

  totalOfficialGames: number;
  officialTrainingStartDate: string | null;
  daysSinceStart: number | null;
  averageGamesPerDay: number | null;
  daysWithGoalMet: number;

  week: WeekProgress;

  daysUntilTournament: number | null;
}

export function computeDailyProgress(input: DailyProgressInput): DailyProgressResult {
  const now = input.now ?? new Date();
  const today = bangkokDateString(now);
  const yesterday = previousDateString(today);

  const countByDate = new Map<string, number>();
  for (const d of input.matchDates) {
    countByDate.set(d, (countByDate.get(d) ?? 0) + 1);
  }
  const gamesOn = (d: string) => countByDate.get(d) ?? 0;

  const gamesToday = gamesOn(today);
  const goalMetToday = gamesToday >= DAILY_GOAL;
  const gamesYesterday = gamesOn(yesterday);

  // Bornes de la plage de calcul : de la date de début officielle (ou de
  // la première partie officielle connue si non réglée) jusqu'à aujourd'hui.
  const knownDates = Array.from(countByDate.keys()).sort();
  const earliestKnown = knownDates[0] ?? today;
  const startDate = input.officialTrainingStartDate || earliestKnown;
  const effectiveStart = daysBetweenDateStrings(startDate, today) >= 0 ? startDate : today;

  let bestStreak = 0;
  let running = 0;
  let daysWithGoalMet = 0;
  const totalDays = Math.max(0, daysBetweenDateStrings(effectiveStart, today));
  for (let i = 0; i <= totalDays; i++) {
    const d = addDaysToDateString(effectiveStart, i);
    const g = gamesOn(d);
    if (g >= DAILY_GOAL) {
      running += 1;
      daysWithGoalMet += 1;
      if (running > bestStreak) bestStreak = running;
    } else {
      running = 0;
    }
  }

  // Série en cours : si aujourd'hui a déjà atteint l'objectif, on part
  // d'aujourd'hui ; sinon aujourd'hui est "en cours" (ni réussi ni raté
  // définitivement) et on part d'hier — jamais de dette reportée, on
  // s'arrête simplement au premier jour < 4 (ou zéro) rencontré.
  let currentStreak = 0;
  let cursor = goalMetToday ? today : yesterday;
  while (daysBetweenDateStrings(effectiveStart, cursor) >= 0) {
    if (gamesOn(cursor) >= DAILY_GOAL) {
      currentStreak += 1;
      cursor = previousDateString(cursor);
    } else {
      break;
    }
  }

  const totalOfficialGames = input.matchDates.length;
  const daysSinceStart = input.officialTrainingStartDate
    ? Math.max(1, daysBetweenDateStrings(input.officialTrainingStartDate, today) + 1)
    : null;
  const averageGamesPerDay = daysSinceStart ? totalOfficialGames / daysSinceStart : null;

  const weekStart = mondayOfWeek(today);
  let gamesThisWeek = 0;
  let daysWithGoalMetThisWeek = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDaysToDateString(weekStart, i);
    if (daysBetweenDateStrings(d, today) < 0) continue; // jour futur de la semaine, pas encore atteint
    const g = gamesOn(d);
    gamesThisWeek += g;
    if (g >= DAILY_GOAL) daysWithGoalMetThisWeek += 1;
  }

  const daysUntilTournament = input.tournamentDate
    ? Math.max(0, Math.ceil((toUtcMidnight(input.tournamentDate.slice(0, 10)).getTime() - now.getTime()) / 86400000))
    : null;

  return {
    today,
    dailyGoal: DAILY_GOAL,
    gamesToday,
    remainingToday: Math.max(0, DAILY_GOAL - gamesToday),
    surplusToday: Math.max(0, gamesToday - DAILY_GOAL),
    goalMetToday,
    goalExceededToday: gamesToday > DAILY_GOAL,
    colorToday: dailyColor(gamesToday, false),

    yesterday,
    gamesYesterday,
    goalMetYesterday: gamesYesterday >= DAILY_GOAL,

    currentStreak,
    bestStreak,

    totalOfficialGames,
    officialTrainingStartDate: input.officialTrainingStartDate || null,
    daysSinceStart,
    averageGamesPerDay,
    daysWithGoalMet,

    week: {
      startDate: weekStart,
      gamesThisWeek,
      weeklyGoal: WEEKLY_GOAL,
      remainingThisWeek: Math.max(0, WEEKLY_GOAL - gamesThisWeek),
      goalMetThisWeek: gamesThisWeek >= WEEKLY_GOAL,
      daysWithGoalMetThisWeek,
    },

    daysUntilTournament,
  };
}
