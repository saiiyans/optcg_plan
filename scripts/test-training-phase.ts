import {
  bangkokDateString,
  computeDailyProgress,
  dailyColor,
  mondayOfWeek,
  DAILY_GOAL,
} from "../src/lib/trainingPhase";

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    failures++;
    console.error("FAIL:", msg);
  }
}

// --- Fuseau Asia/Bangkok (UTC+7) ---
// 2026-08-23T18:00:00Z = 2026-08-24T01:00:00+07:00 -> déjà le 24 en Bangkok.
assert(
  bangkokDateString(new Date("2026-08-23T18:00:00Z")) === "2026-08-24",
  "bangkokDateString doit basculer au jour suivant dès 17h00 UTC (minuit Bangkok)"
);
// 2026-08-23T16:59:00Z = 2026-08-23T23:59:00+07:00 -> encore le 23 en Bangkok.
assert(
  bangkokDateString(new Date("2026-08-23T16:59:00Z")) === "2026-08-23",
  "bangkokDateString doit rester au jour courant juste avant minuit Bangkok"
);

assert(mondayOfWeek("2026-08-24") === "2026-08-24", "24/08/2026 est un lundi"); // vérifié
assert(mondayOfWeek("2026-08-27") === "2026-08-24", "27/08/2026 (jeudi) -> lundi 24/08/2026");

// --- DAILY_GOAL = 4 ---
assert(DAILY_GOAL === 4, "objectif quotidien = 4 parties");

// --- Couleurs (section 3) ---
assert(dailyColor(0, false) === "gray", "0 partie, jour en cours -> gris");
assert(dailyColor(2, false) === "orange", "2 parties, jour en cours -> orange");
assert(dailyColor(4, false) === "green", "4 parties, jour en cours -> vert");
assert(dailyColor(6, false) === "gold", "6 parties, jour en cours -> or");
assert(dailyColor(3, true) === "red", "3 parties, jour terminé -> rouge (objectif manqué)");
assert(dailyColor(4, true) === "green", "4 parties, jour terminé -> vert");

// --- Scénario "nouveau jour" : aucune partie aujourd'hui, hier 3/4 (test 21 + 23) ---
{
  const now = new Date("2026-08-25T10:00:00Z"); // = 25/08 17h Bangkok
  const today = bangkokDateString(now); // "2026-08-25"
  const yesterday = "2026-08-24";
  const result = computeDailyProgress({
    matchDates: [yesterday, yesterday, yesterday], // 3/4 hier
    officialTrainingStartDate: "2026-08-20",
    now,
  });
  assert(result.today === today, "today calculé correctement");
  assert(result.gamesToday === 0, "nouveau jour : 0 partie aujourd'hui, aucune suppression nécessaire");
  assert(result.remainingToday === 4, "0/4 -> il reste 4 parties");
  assert(!result.goalMetToday, "objectif non atteint à 0/4");
  assert(result.gamesYesterday === 3, "hier : 3 parties enregistrées, jamais effacées");
  assert(!result.goalMetYesterday, "hier : objectif manqué (3 < 4)");
  assert(result.currentStreak === 0, "série en cours = 0 (hier a raté l'objectif)");
}

// --- 1ère partie officielle -> 1/4, puis 4e -> 4/4, puis 5e -> 5/4 (tests 3/4/5) ---
{
  const today = "2026-08-24";
  const now = new Date(today + "T05:00:00Z"); // 12h Bangkok, encore le 24
  const one = computeDailyProgress({ matchDates: [today], officialTrainingStartDate: today, now });
  assert(one.gamesToday === 1 && one.remainingToday === 3 && !one.goalMetToday, "1ère partie du jour -> 1/4");

  const four = computeDailyProgress({
    matchDates: [today, today, today, today],
    officialTrainingStartDate: today,
    now,
  });
  assert(four.gamesToday === 4 && four.remainingToday === 0 && four.goalMetToday && !four.goalExceededToday, "4e partie -> 4/4, objectif atteint");

  const five = computeDailyProgress({
    matchDates: [today, today, today, today, today],
    officialTrainingStartDate: today,
    now,
  });
  assert(five.gamesToday === 5 && five.goalExceededToday && five.surplusToday === 1, "5e partie -> 5/4, objectif dépassé de 1");
}

// --- Compteur officiel démarre à zéro (section 22/23) ---
{
  const result = computeDailyProgress({ matchDates: [], officialTrainingStartDate: "2026-08-24", now: new Date("2026-08-24T03:00:00Z") });
  assert(result.totalOfficialGames === 0, "aucune partie officielle -> compteur à zéro");
  assert(result.currentStreak === 0 && result.bestStreak === 0, "aucune série sans partie officielle");
}

// --- Série de 4 jours réussis (section 20 exemple) puis rupture ---
{
  const matchDates: string[] = [];
  const days = ["2026-08-20", "2026-08-21", "2026-08-22", "2026-08-23"];
  for (const d of days) for (let i = 0; i < 4; i++) matchDates.push(d);
  // jour 24 : seulement 2 parties (objectif manqué)
  matchDates.push("2026-08-24", "2026-08-24");
  const now = new Date("2026-08-25T03:00:00Z"); // aujourd'hui = 25, aucune partie ce jour-là
  const result = computeDailyProgress({ matchDates, officialTrainingStartDate: "2026-08-20", now });
  assert(result.bestStreak === 4, "meilleure série = 4 jours consécutifs réussis");
  assert(result.currentStreak === 0, "série en cours = 0 : le 24 a raté l'objectif (2/4), rupture");
  assert(!result.goalMetYesterday, "hier (24) : objectif manqué");
}

// --- Jamais de dette : un jour manqué ne doit jamais faire remonter un total négatif ni bloquer les jours suivants ---
{
  const matchDates = ["2026-08-20", "2026-08-20", "2026-08-20", "2026-08-20", "2026-08-22", "2026-08-22", "2026-08-22", "2026-08-22"];
  // 21/08 : aucune partie (jour manqué, aucune trace de "dette")
  const now = new Date("2026-08-22T15:00:00Z"); // encore le 22 en Bangkok
  const result = computeDailyProgress({ matchDates, officialTrainingStartDate: "2026-08-20", now });
  assert(result.gamesToday === 4 && result.goalMetToday, "22/08 atteint son propre objectif malgré le 21/08 manqué");
  assert(result.currentStreak === 1, "série en cours = 1 (seul le 22 compte, le 21 a cassé la série précédente)");
}

if (failures > 0) {
  console.error(`\n${failures} test(s) échoué(s).`);
  process.exit(1);
} else {
  console.log("ALL TESTS PASSED (trainingPhase.ts)");
}
