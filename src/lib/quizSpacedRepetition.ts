/**
 * Répétition espacée simple pour le Quiz des effets (section 11 du cahier
 * des charges du 31/08/2026) — règles fixes, pas d'algorithme SM-2/Anki
 * complet (hors-scope), mais un vrai calcul déterministe et testé (voir
 * scripts/test-quiz-engine.ts), jamais un simple "+1 jour" uniforme.
 */

export interface MasteryState {
  level: number; // 0 à 5
  currentStreak: number;
  bestStreak: number;
  appearances: number;
  correct: number;
  incorrect: number;
}

export interface MasteryUpdateResult extends MasteryState {
  nextReviewAt: Date;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// Niveau de maîtrise (0 à 5 étoiles) — libellés affichés dans l'UI.
export const MASTERY_LABELS: Record<number, string> = {
  0: "Jamais étudiée",
  1: "Découverte",
  2: "Fragile",
  3: "En apprentissage",
  4: "Presque maîtrisée",
  5: "Maîtrisée",
};

/**
 * Calcule le nouvel état de maîtrise + la prochaine date de révision après
 * une réponse. Règles (section 11) :
 *  - Erreur : niveau réduit d'1 (jamais sous 0), révision rapprochée (+2h).
 *  - 1ère réussite (streak=1) : révision le lendemain (+1 jour).
 *  - 2 réussites d'affilée (streak=2) : +3 jours.
 *  - 3 réussites d'affilée (streak=3) : +7 jours.
 *  - Streak >= 4 ET niveau atteint 5 : "maîtrisée", +21 jours (milieu de
 *    la fourchette 14-30 jours demandée).
 *  - Entre les deux (streak 4+ mais niveau < 5) : +7 jours, le temps que
 *    le niveau atteigne 5.
 */
export function updateMastery(state: MasteryState, wasCorrect: boolean, now: Date = new Date()): MasteryUpdateResult {
  const appearances = state.appearances + 1;

  if (!wasCorrect) {
    return {
      level: Math.max(0, state.level - 1),
      currentStreak: 0,
      bestStreak: state.bestStreak,
      appearances,
      correct: state.correct,
      incorrect: state.incorrect + 1,
      nextReviewAt: new Date(now.getTime() + 2 * HOUR),
    };
  }

  const currentStreak = state.currentStreak + 1;
  const bestStreak = Math.max(state.bestStreak, currentStreak);
  const level = Math.min(5, state.level + 1);

  let delayMs: number;
  if (currentStreak === 1) delayMs = 1 * DAY;
  else if (currentStreak === 2) delayMs = 3 * DAY;
  else if (currentStreak === 3) delayMs = 7 * DAY;
  else delayMs = level >= 5 ? 21 * DAY : 7 * DAY;

  return {
    level,
    currentStreak,
    bestStreak,
    appearances,
    correct: state.correct + 1,
    incorrect: state.incorrect,
    nextReviewAt: new Date(now.getTime() + delayMs),
  };
}

/** Cartes dues aujourd'hui = nextReviewAt <= maintenant (ou jamais révisées mais déjà apparues). */
export function isDueForReview(nextReviewAt: Date | null, now: Date = new Date()): boolean {
  if (!nextReviewAt) return true;
  return nextReviewAt.getTime() <= now.getTime();
}
