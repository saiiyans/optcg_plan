import { DAILY_GOAL, WEEKLY_GOAL, MIN_SAMPLE_SIZE, APP_TIMEZONE, DEFAULT_TOURNAMENT_DATE, DEFAULT_DECK_NAME } from "../src/lib/config";
import { computeDailyProgress, bangkokDateString } from "../src/lib/trainingPhase";

// --- Source unique de configuration (config.ts) — vérifie que les
// constantes qui alimentent TOUTE l'app ont bien les valeurs demandées, et
// que rien d'autre dans le code ne les redéfinit différemment (le bug
// "0/4 ici, 0/3 ailleurs" et "18 ici, 28 ailleurs" venait exactement de là).

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    failures++;
    console.error("FAIL:", msg);
  }
}

assert(DAILY_GOAL === 4, "DAILY_GOAL doit être 4 (source unique config.ts)");
assert(WEEKLY_GOAL === 28, "WEEKLY_GOAL doit être 28 (= DAILY_GOAL × 7), jamais 18");
assert(WEEKLY_GOAL === DAILY_GOAL * 7, "WEEKLY_GOAL doit toujours être dérivé de DAILY_GOAL, jamais un chiffre indépendant");
assert(MIN_SAMPLE_SIZE === 5, "MIN_SAMPLE_SIZE doit être 5 (seuil d'échantillon fiable)");
assert(APP_TIMEZONE === "Asia/Bangkok", "APP_TIMEZONE doit être Asia/Bangkok, jamais UTC");
assert(/^\d{4}-\d{2}-\d{2}$/.test(DEFAULT_TOURNAMENT_DATE), "DEFAULT_TOURNAMENT_DATE doit être au format ISO yyyy-mm-dd");
assert(DEFAULT_DECK_NAME.length > 0, "DEFAULT_DECK_NAME ne doit jamais être vide");

// --- computeDailyProgress doit exposer un objectif hebdo de 28 dans
// week.weeklyGoal, jamais un autre chiffre codé en dur (ancien bug : 18,
// venant d'un système de planning à 7 semaines différent, retiré). ---
const today = bangkokDateString();
const progressEmpty = computeDailyProgress({ matchDates: [], officialTrainingStartDate: today });
assert(progressEmpty.week.weeklyGoal === 28, `week.weeklyGoal doit être 28 (obtenu ${progressEmpty.week.weeklyGoal})`);
assert(progressEmpty.week.gamesThisWeek === 0, "0 partie officielle -> 0 partie cette semaine");
assert(progressEmpty.week.remainingThisWeek === 28, "0/28 -> 28 restantes");
assert(!progressEmpty.week.goalMetThisWeek, "0/28 -> objectif hebdo pas atteint");
assert(progressEmpty.dailyGoal === 4, `progress.dailyGoal doit être 4 (obtenu ${progressEmpty.dailyGoal})`);
assert(progressEmpty.gamesToday === 0 && progressEmpty.remainingToday === 4, "0 partie aujourd'hui -> 0/4, 4 restantes");

// --- 4 parties aujourd'hui (même jour Bangkok) -> objectif du jour atteint,
// semaine à 4/28, 24 restantes. ---
const progress4Today = computeDailyProgress({ matchDates: [today, today, today, today], officialTrainingStartDate: today });
assert(progress4Today.goalMetToday, "4 parties aujourd'hui -> objectif du jour atteint");
assert(progress4Today.remainingToday === 0, "4/4 -> 0 restante aujourd'hui");
assert(progress4Today.week.gamesThisWeek === 4, `4 parties cette semaine (obtenu ${progress4Today.week.gamesThisWeek})`);
assert(progress4Today.week.remainingThisWeek === 24, `28 - 4 = 24 restantes cette semaine (obtenu ${progress4Today.week.remainingThisWeek})`);
assert(!progress4Today.week.goalMetThisWeek, "4/28 -> objectif hebdo pas encore atteint");

// --- 28 parties officielles réparties sur la semaine -> objectif hebdo
// atteint. ---
const weekStart = progress4Today.week.startDate;
const sevenDayDates: string[] = [];
for (let i = 0; i < 7; i++) {
  const d = new Date(weekStart + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + i);
  const iso = d.toISOString().slice(0, 10);
  if (iso > today) break; // ne compte que les jours déjà écoulés cette semaine
  for (let g = 0; g < 4; g++) sevenDayDates.push(iso);
}
const progressFullWeek = computeDailyProgress({ matchDates: sevenDayDates, officialTrainingStartDate: weekStart });
assert(
  progressFullWeek.week.gamesThisWeek === sevenDayDates.length,
  `toutes les parties de la semaine comptées (obtenu ${progressFullWeek.week.gamesThisWeek}, attendu ${sevenDayDates.length})`
);
if (sevenDayDates.length >= 28) {
  assert(progressFullWeek.week.goalMetThisWeek, "28+ parties cette semaine -> objectif hebdo atteint");
}

if (failures > 0) {
  console.error(`\n${failures} test(s) échoué(s).`);
  process.exit(1);
} else {
  console.log("ALL TESTS PASSED (config.ts + trainingPhase.ts week goal)");
}
