import { WEEKS, TOURNAMENT_DATE } from "./planningData";

export interface GameCounterStats {
  totalTarget: number; // objectif total sur les 7 semaines (114 par défaut)
  totalPlayed: number;
  remaining: number;
  currentWeekN: number;
  playedThisWeek: number;
  weekTarget: number;
  expectedByToday: number; // combien de parties on "devrait" avoir jouées à date, au prorata du planning
  status: "avance" | "rythme" | "retard";
  dailyPaceNeeded: number; // parties/jour nécessaires sur le temps restant pour atteindre l'objectif
  daysLeft: number;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Calcule où on en est par rapport au planning des 7 semaines, à partir des
 * vraies parties loguées. Ne code jamais le nombre de parties jouées en dur
 * — tout vient de la liste `matches` passée en argument.
 */
export function computeGameCounterStats(matches: { date: string }[]): GameCounterStats {
  const today = todayISO();
  const totalTarget = WEEKS.reduce((s, w) => s + w.sim + w.bout, 0);
  const totalPlayed = matches.length;

  const currentWeek = (() => {
    const past = WEEKS.filter((w) => w.startDate <= today);
    return past.length ? past[past.length - 1] : WEEKS[0];
  })();

  const weekStart = new Date(currentWeek.startDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekStartISO = weekStart.toISOString().slice(0, 10);
  const weekEndISO = weekEnd.toISOString().slice(0, 10);
  const playedThisWeek = matches.filter((m) => m.date >= weekStartISO && m.date <= weekEndISO).length;
  const weekTarget = currentWeek.sim + currentWeek.bout;

  // Parties déjà "dues" au prorata du planning : toutes les semaines précédentes en entier
  // + la fraction de la semaine en cours déjà écoulée.
  const priorWeeksTarget = WEEKS.filter((w) => w.n < currentWeek.n).reduce((s, w) => s + w.sim + w.bout, 0);
  const daysIntoWeek = Math.min(
    7,
    Math.max(0, Math.floor((new Date(today).getTime() - weekStart.getTime()) / 86400000) + 1)
  );
  const expectedByToday = Math.round(priorWeeksTarget + (weekTarget * daysIntoWeek) / 7);

  let status: GameCounterStats["status"] = "rythme";
  if (totalPlayed > expectedByToday + 2) status = "avance";
  else if (totalPlayed < expectedByToday - 2) status = "retard";

  const daysLeft = Math.max(0, Math.ceil((new Date(TOURNAMENT_DATE).getTime() - Date.now()) / 86400000));
  const remaining = Math.max(0, totalTarget - totalPlayed);
  const dailyPaceNeeded = daysLeft > 0 ? Math.round((remaining / daysLeft) * 10) / 10 : remaining;

  return {
    totalTarget,
    totalPlayed,
    remaining,
    currentWeekN: currentWeek.n,
    playedThisWeek,
    weekTarget,
    expectedByToday,
    status,
    dailyPaceNeeded,
    daysLeft,
  };
}
