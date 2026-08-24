import {
  appendMatchToMission,
  missionProgress,
  parseMissionMatchIds,
  resetMissionForContinuation,
  selectMissionPriority,
  MISSION_GAME_TARGET,
} from "../src/lib/missionEngine";

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    failures++;
    console.error("FAIL:", msg);
  }
}

assert(MISSION_GAME_TARGET === 3, "objectif de mission = 3 parties");

// --- Progression 0/3 -> 1/3 -> 2/3 -> 3/3, jamais au-delà (test 19 de la section 23) ---
{
  let json = "[]";
  assert(missionProgress(json).matchCount === 0, "mission neuve : 0/3");
  json = appendMatchToMission(json, "m1");
  assert(missionProgress(json).matchCount === 1, "après 1 partie : 1/3");
  json = appendMatchToMission(json, "m2");
  json = appendMatchToMission(json, "m3");
  const p = missionProgress(json);
  assert(p.matchCount === 3 && p.isReadyForDecision, "après 3 parties : 3/3, prête pour décision");
  // une 4e partie ne doit jamais faire dépasser 3 tant qu'aucune décision n'a été prise
  json = appendMatchToMission(json, "m4");
  assert(missionProgress(json).matchCount === 3, "ne dépasse jamais 3/3 sans décision explicite");
}

// --- Idempotence : la même partie ne doit jamais être comptée deux fois ---
{
  let json = appendMatchToMission("[]", "m1");
  json = appendMatchToMission(json, "m1");
  assert(missionProgress(json).matchCount === 1, "une partie déjà comptée n'est jamais recomptée");
}

// --- "Continuer" repart à 0/3 (même priorité, gérée par l'appelant) ---
{
  const json = resetMissionForContinuation();
  assert(missionProgress(json).matchCount === 0, "continuer la mission -> 0/3");
}

// --- JSON invalide ne casse jamais le parsing (retrocompatibilité) ---
assert(parseMissionMatchIds(null).length === 0, "matchIdsJson null -> []");
assert(parseMissionMatchIds("not json").length === 0, "JSON invalide -> [] plutôt qu'une erreur");

// --- Sélection : jamais deux fois la même priorité juste après un "next" ---
{
  const defeats = [
    { id: "1", date: "2026-08-05", tags: ["Overcounter"] },
    { id: "2", date: "2026-08-04", tags: ["Overcounter"] },
    { id: "3", date: "2026-08-03", tags: ["Overcounter"] },
  ];
  const withoutExclusion = selectMissionPriority(defeats);
  assert(withoutExclusion.hasData && withoutExclusion.priority === "Éviter l'overcounter", "sélectionne la priorité la plus fréquente");

  const withExclusion = selectMissionPriority(defeats, "Éviter l'overcounter");
  assert(!withExclusion.hasData, "n'invente jamais une priorité différente sans donnée suffisante pour la distinguer");
}

if (failures > 0) {
  console.error(`\n${failures} test(s) échoué(s).`);
  process.exit(1);
} else {
  console.log("ALL TESTS PASSED (missionEngine.ts)");
}
