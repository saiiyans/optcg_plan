// --- Mission d'entraînement unique (section 10) — logique pure, testable
// sans base de données. Une seule mission "active" à la fois : jamais dix
// erreurs à corriger en même temps. La sélection réutilise
// `computeTrainingPriority` (section 8) sans le dupliquer ; ce module
// n'ajoute que le suivi de progression sur 3 parties et la gestion de fin
// de mission (continuer / valider / passer à la priorité suivante).

import {
  computeTrainingPriority,
  PRIORITY_MISSION,
  type MatchTagSample,
  type TrainingPriorityKey,
  type TrainingPriorityResult,
} from "./defeatAnalysis";

export const MISSION_GAME_TARGET = 3;

export interface MissionProgress {
  matchCount: number;
  target: number;
  isReadyForDecision: boolean;
}

export function parseMissionMatchIds(matchIdsJson: string | null | undefined): string[] {
  if (!matchIdsJson) return [];
  try {
    const parsed = JSON.parse(matchIdsJson);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function missionProgress(matchIdsJson: string | null | undefined): MissionProgress {
  const ids = parseMissionMatchIds(matchIdsJson);
  return { matchCount: ids.length, target: MISSION_GAME_TARGET, isReadyForDecision: ids.length >= MISSION_GAME_TARGET };
}

/**
 * Ajoute une partie au suivi de la mission active. Idempotent (une partie
 * déjà comptée n'est jamais recomptée) et plafonné à MISSION_GAME_TARGET :
 * une fois 3/3 atteint, la mission attend une décision du joueur avant de
 * continuer à avancer (voir resetMissionForContinuation).
 */
export function appendMatchToMission(matchIdsJson: string | null | undefined, matchId: string): string {
  const ids = parseMissionMatchIds(matchIdsJson);
  if (ids.includes(matchId) || ids.length >= MISSION_GAME_TARGET) {
    return JSON.stringify(ids);
  }
  return JSON.stringify([...ids, matchId]);
}

/** "Continuer la mission" — même priorité, on repart à 0/3. */
export function resetMissionForContinuation(): string {
  return JSON.stringify([]);
}

export type MissionDecision = "continue" | "validate" | "next";

/**
 * Sélectionne la priorité de la prochaine mission. Ne propose JAMAIS une
 * priorité sans donnée suffisante (voir computeTrainingPriority), et ne
 * réutilise jamais la priorité qu'on vient d'écarter volontairement
 * (`excludePriority`, utilisé après une décision "next").
 */
export function selectMissionPriority(
  recentDefeats: MatchTagSample[],
  excludePriority?: TrainingPriorityKey
): TrainingPriorityResult {
  const result = computeTrainingPriority(recentDefeats);
  if (!result.hasData) return result;
  if (excludePriority && result.priority === excludePriority) {
    return {
      hasData: false,
      reason:
        "Le sujet le plus fréquent reste le même que la mission précédente — pas encore assez de données pour identifier une priorité différente. Continue à enregistrer tes parties avec le détail des erreurs.",
    };
  }
  return result;
}

export function missionInstructions(priorityKey: TrainingPriorityKey): string {
  return PRIORITY_MISSION[priorityKey];
}
