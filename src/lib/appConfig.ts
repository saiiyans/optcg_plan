import { db } from "./db";
import {
  DAILY_GOAL,
  WEEKLY_GOAL,
  MIN_SAMPLE_SIZE,
  APP_TIMEZONE,
  DEFAULT_TOURNAMENT_DATE,
  DEFAULT_DECK_NAME,
} from "./config";

export { DAILY_GOAL, WEEKLY_GOAL, MIN_SAMPLE_SIZE, APP_TIMEZONE };

export interface ActiveConfig {
  tournamentDate: string; // ISO yyyy-mm-dd
  activeDeckName: string;
  dailyGoal: number;
  weeklyGoal: number;
  minSampleSize: number;
  timezone: string;
}

/**
 * Résout la configuration active de l'app : les valeurs réglées en base
 * (AppSettings — date du tournoi, deck actif) en priorité, sinon les
 * constantes de repli de config.ts. TOUTE route ou page qui a besoin de la
 * date du tournoi ou du deck actif doit passer par cette fonction — jamais
 * réimporter TOURNAMENT_DATE/MY_DECKS de planningData.ts ou recalculer un
 * repli différent localement (c'est exactement ce qui produisait des
 * chiffres différents d'une page à l'autre avant cette refonte).
 */
export async function getActiveConfig(): Promise<ActiveConfig> {
  const settings = await db.appSettings.findUnique({ where: { id: "singleton" } }).catch(() => null);
  return {
    tournamentDate: settings?.activeTournamentDate || DEFAULT_TOURNAMENT_DATE,
    activeDeckName: settings?.activeDeckName || DEFAULT_DECK_NAME,
    dailyGoal: DAILY_GOAL,
    weeklyGoal: WEEKLY_GOAL,
    minSampleSize: MIN_SAMPLE_SIZE,
    timezone: APP_TIMEZONE,
  };
}
