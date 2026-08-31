import {
  fisherYatesShuffle,
  buildQuestion,
  MILLIONAIRE_LADDER,
  SAFE_HAVEN_INDEXES,
  isSafeHaven,
  guaranteedScore,
  millionaireDifficultyTier,
  validateAnswerSet,
} from "../src/lib/quizEngine";
import { updateMastery, isDueForReview, type MasteryState } from "../src/lib/quizSpacedRepetition";
import { computeDifficulty } from "../src/lib/quizDifficulty";

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    failures++;
    console.error("FAIL:", msg);
  }
}

// --- fisherYatesShuffle ---
{
  // RNG déterministe injecté (0, puis 0.999999 alterné) pour vérifier que
  // chaque position est réellement permutée par l'algorithme de Durstenfeld,
  // pas un no-op.
  const seq = [0.1, 0.9, 0.5, 0.2];
  let i = 0;
  const rng = () => seq[i++ % seq.length];
  const input = [1, 2, 3, 4, 5];
  const shuffled = fisherYatesShuffle(input, rng);
  assert(shuffled.length === 5, "fisherYatesShuffle conserve la longueur");
  assert(input.join(",") === "1,2,3,4,5", "fisherYatesShuffle n'altère jamais le tableau d'origine");
  assert([...shuffled].sort().join(",") === "1,2,3,4,5", "fisherYatesShuffle est une vraie permutation (mêmes éléments)");

  // Distribution : sur beaucoup de tirages Math.random réel, chaque position
  // finale doit apparaître à peu près uniformément (pas de biais flagrant
  // comme avec un tri par comparateur aléatoire naïf).
  const positionCounts = [0, 0, 0, 0];
  const N = 20000;
  for (let t = 0; t < N; t++) {
    const out = fisherYatesShuffle([0, 1, 2, 3]);
    positionCounts[out.indexOf(0)]++;
  }
  const expected = N / 4;
  const maxDeviation = Math.max(...positionCounts.map((c) => Math.abs(c - expected)));
  assert(maxDeviation < expected * 0.15, `fisherYatesShuffle : distribution ~uniforme sur ${N} tirages (écart max ${maxDeviation}, attendu < ${expected * 0.15})`);
}

// --- buildQuestion : structure de base ---
{
  const built = buildQuestion("BON", ["MAUVAIS1", "MAUVAIS2", "MAUVAIS3"], [0, 0, 0, 0], () => 0);
  assert(built.options.length === 4, "buildQuestion renvoie toujours exactement 4 options");
  assert(built.options.filter((o) => o.isCorrect).length === 1, "buildQuestion : une seule bonne réponse parmi les 4");
  assert(built.options[built.correctIndex].isCorrect, "correctIndex pointe bien vers la bonne réponse");
  const texts = built.options.map((o) => o.text).sort();
  assert(texts.join("|") === ["BON", "MAUVAIS1", "MAUVAIS2", "MAUVAIS3"].sort().join("|"), "buildQuestion conserve les 4 textes fournis, rien inventé/perdu");
}

// --- buildQuestion : équilibrage de la distribution sur une session ---
{
  // Position 0 (A) déjà utilisée 2 fois de plus que les autres -> le
  // rejection-sampling doit éviter de retomber sur A si un autre tirage
  // est possible avec le RNG donné.
  const rngSeq = [0, 0, 0.9]; // 1er tirage tombe sur A (index0), rejeté, 2e tirage sur un autre index
  let i = 0;
  const rng = () => rngSeq[Math.min(i++, rngSeq.length - 1)];
  const built = buildQuestion("BON", ["M1", "M2", "M3"], [3, 1, 1, 1], rng);
  assert(built.options[built.correctIndex].isCorrect, "buildQuestion (équilibrage) : correctIndex toujours cohérent avec isCorrect");
}
{
  // Pas de déséquilibre (écart < 2) -> aucune re-tentative, un seul appel RNG-shuffle attendu, résultat toujours valide.
  const built = buildQuestion("BON", ["M1", "M2", "M3"], [1, 1, 1, 0], () => 0.42);
  assert(built.options[built.correctIndex].isCorrect, "buildQuestion (pas de déséquilibre) reste cohérent");
}

// --- Mode Millionnaire : palier ---
assert(MILLIONAIRE_LADDER.length === 15, "échelle Millionnaire = 15 paliers");
assert(MILLIONAIRE_LADDER[0] === 100 && MILLIONAIRE_LADDER[14] === 1000000, "échelle Millionnaire : 100 -> 1 000 000");
assert(JSON.stringify(SAFE_HAVEN_INDEXES) === JSON.stringify([4, 9]), "paliers sécurisés = question 5 (index 4) et question 10 (index 9)");
assert(isSafeHaven(4) && isSafeHaven(9) && !isSafeHaven(0) && !isSafeHaven(14), "isSafeHaven ne reconnaît que les index 4 et 9");
assert(guaranteedScore(0) === 0, "aucun palier sécurisé atteint avant la question 1 -> 0");
assert(guaranteedScore(5) === 1000, "échec à la question 6 (index 5) -> garanti 1000 (palier sécurisé n°1 franchi)");
assert(guaranteedScore(4) === 0, "échec à la question 5 (index 4, pas encore validée) -> toujours 0");
assert(guaranteedScore(10) === 32000, "échec à la question 11 (index 10) -> garanti 32000 (2e palier sécurisé franchi)");
assert(guaranteedScore(14) === 32000, "échec à la question 15 (dernière) -> garanti 32000 tant que ce palier est le dernier franchi");

assert(millionaireDifficultyTier(0) === 1 && millionaireDifficultyTier(4) === 1, "questions 1-5 -> difficulté 1");
assert(millionaireDifficultyTier(5) === 2 && millionaireDifficultyTier(9) === 2, "questions 6-10 -> difficulté 2");
assert(millionaireDifficultyTier(10) === 3 && millionaireDifficultyTier(14) === 3, "questions 11-15 -> difficulté 3");

// --- validateAnswerSet ---
assert(validateAnswerSet("Le vrai effet", ["Faux 1", "Faux 2", "Faux 3"]).length === 0, "validateAnswerSet : jeu de réponses valide -> aucun problème détecté");
assert(
  validateAnswerSet("Le vrai effet", ["Faux 1", "Faux 1", "Faux 3"]).some((i) => i.code === "duplicate_wrong_answers"),
  "validateAnswerSet détecte deux mauvaises réponses identiques"
);
assert(
  validateAnswerSet("Le vrai effet", ["Le vrai effet", "Faux 2", "Faux 3"]).some((i) => i.code === "wrong_matches_correct"),
  "validateAnswerSet détecte une mauvaise réponse identique à la vraie"
);
assert(
  validateAnswerSet("Le vrai effet", ["  LE VRAI EFFET !!", "Faux 2", "Faux 3"]).some((i) => i.code === "wrong_matches_correct"),
  "validateAnswerSet détecte l'identité après normalisation (casse/ponctuation/espaces)"
);
assert(
  validateAnswerSet("", ["Faux 1", "Faux 2", "Faux 3"]).some((i) => i.code === "missing_correct_answer"),
  "validateAnswerSet détecte une bonne réponse absente"
);
assert(
  validateAnswerSet("Le vrai effet", ["Faux 1", "Faux 2"]).some((i) => i.code === "too_few_wrong_answers"),
  "validateAnswerSet détecte moins de 3 mauvaises réponses"
);
assert(
  validateAnswerSet("Le vrai effet", ["", "Faux 2", "Faux 3"]).some((i) => i.code === "empty_answer"),
  "validateAnswerSet détecte une mauvaise réponse vide"
);
assert(
  validateAnswerSet("Gagnez 2000 puissance ce tour.", ["Gagnez 1000 puissance ce tour.", "Piochez 2 cartes.", "Le joueur adverse défausse une carte."]).length === 0,
  "validateAnswerSet : réponses réalistes proches de l'effet réel -> valides"
);

// --- computeDifficulty ---
assert(computeDifficulty(null) === 1, "computeDifficulty : texte absent -> difficulté 1 par défaut (jamais bloquant)");
assert(computeDifficulty("") === 1, "computeDifficulty : texte vide -> difficulté 1");
assert(computeDifficulty("Gagnez 1000 puissance.") === 1, "computeDifficulty : effet court et simple -> difficulté 1");
{
  const complex =
    "[On Play] [When Attacking] If you have 3 or more DON!! cards attached to your Leader or Characters, up to 2 of your Characters gain +1000 power during this turn, unless your opponent has a Character other than a Leader. [Trigger] Instead, K.O. up to 1 Character with 3000 power or less.";
  assert(computeDifficulty(complex) === 3, "computeDifficulty : texte long + plusieurs mots-clés + conditions -> difficulté 3");
}

// --- updateMastery (répétition espacée) ---
{
  const base: MasteryState = { level: 2, currentStreak: 0, bestStreak: 3, appearances: 5, correct: 3, incorrect: 2 };
  const now = new Date("2026-08-31T12:00:00Z");

  const wrong = updateMastery(base, false, now);
  assert(wrong.level === 1, "réponse fausse : niveau -1");
  assert(wrong.currentStreak === 0, "réponse fausse : série repart à 0");
  assert(wrong.incorrect === 3 && wrong.correct === 3, "réponse fausse : compteur incorrect incrémenté, correct inchangé");
  assert(wrong.nextReviewAt.getTime() === now.getTime() + 2 * 3600 * 1000, "réponse fausse : prochaine révision dans 2h");

  const floorState: MasteryState = { level: 0, currentStreak: 0, bestStreak: 0, appearances: 0, correct: 0, incorrect: 0 };
  assert(updateMastery(floorState, false, now).level === 0, "le niveau ne descend jamais sous 0");

  const s1 = updateMastery(base, true, now);
  assert(s1.currentStreak === 1 && s1.level === 3, "1ère bonne réponse : streak=1, niveau +1");
  assert(s1.nextReviewAt.getTime() === now.getTime() + 24 * 3600 * 1000, "streak=1 -> +1 jour");

  const stateStreak1: MasteryState = { ...base, currentStreak: 1 };
  const s2 = updateMastery(stateStreak1, true, now);
  assert(s2.currentStreak === 2, "2e bonne réponse d'affilée : streak=2");
  assert(s2.nextReviewAt.getTime() === now.getTime() + 3 * 24 * 3600 * 1000, "streak=2 -> +3 jours");

  const stateStreak2: MasteryState = { ...base, currentStreak: 2 };
  const s3 = updateMastery(stateStreak2, true, now);
  assert(s3.currentStreak === 3, "3e bonne réponse d'affilée : streak=3");
  assert(s3.nextReviewAt.getTime() === now.getTime() + 7 * 24 * 3600 * 1000, "streak=3 -> +7 jours");

  // streak 4+, niveau pas encore à 5 -> +7 jours (palier intermédiaire).
  const stateStreak3Level3: MasteryState = { level: 3, currentStreak: 3, bestStreak: 3, appearances: 8, correct: 6, incorrect: 2 };
  const s4mid = updateMastery(stateStreak3Level3, true, now);
  assert(s4mid.currentStreak === 4 && s4mid.level === 4, "streak passe à 4, niveau à 4 (pas encore 5)");
  assert(s4mid.nextReviewAt.getTime() === now.getTime() + 7 * 24 * 3600 * 1000, "streak>=4 mais niveau<5 -> +7 jours");

  // streak 4+, niveau atteint 5 -> "maîtrisée", +21 jours.
  const stateStreak3Level4: MasteryState = { level: 4, currentStreak: 3, bestStreak: 3, appearances: 10, correct: 8, incorrect: 2 };
  const s4mastered = updateMastery(stateStreak3Level4, true, now);
  assert(s4mastered.currentStreak === 4 && s4mastered.level === 5, "streak=4, niveau atteint 5 -> maîtrisée");
  assert(s4mastered.nextReviewAt.getTime() === now.getTime() + 21 * 24 * 3600 * 1000, "streak>=4 et niveau=5 -> +21 jours");

  // le niveau plafonne à 5, jamais au-delà.
  const alreadyMax: MasteryState = { level: 5, currentStreak: 5, bestStreak: 5, appearances: 20, correct: 18, incorrect: 2 };
  const capped = updateMastery(alreadyMax, true, now);
  assert(capped.level === 5, "le niveau ne dépasse jamais 5");

  // bestStreak ne redescend jamais.
  const withBest: MasteryState = { level: 1, currentStreak: 0, bestStreak: 6, appearances: 10, correct: 5, incorrect: 5 };
  assert(updateMastery(withBest, false, now).bestStreak === 6, "bestStreak ne redescend jamais après un échec");
  assert(updateMastery(withBest, true, now).bestStreak === 6, "bestStreak reste au max tant que la nouvelle série ne le dépasse pas");
}

// --- isDueForReview ---
{
  const now = new Date("2026-08-31T12:00:00Z");
  assert(isDueForReview(null, now), "carte jamais révisée (nextReviewAt null) -> toujours due");
  assert(isDueForReview(new Date("2026-08-31T11:00:00Z"), now), "date de révision passée -> due");
  assert(isDueForReview(new Date("2026-08-31T12:00:00Z"), now), "date de révision = maintenant -> due (limite incluse)");
  assert(!isDueForReview(new Date("2026-08-31T13:00:00Z"), now), "date de révision future -> pas encore due");
}

if (failures > 0) {
  console.error(`\n${failures} test(s) échoué(s).`);
  process.exit(1);
} else {
  console.log("ALL TESTS PASSED (quizEngine.ts / quizSpacedRepetition.ts / quizDifficulty.ts)");
}
