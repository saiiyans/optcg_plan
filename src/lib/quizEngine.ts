/**
 * Moteur du "Quiz des effets" (demandé le 31/08/2026) — logique pure,
 * séparée des données (voir quizCandidates.ts) et de l'interface (voir
 * src/app/quiz/**), testée indépendamment (voir scripts/test-quiz-engine.ts).
 */

export type RngFn = () => number; // injectable pour les tests (déterministe)

/**
 * Vrai mélange de Fisher-Yates (Durstenfeld) — jamais un simple
 * `.sort(() => Math.random() - 0.5)`, biaisé et non uniforme.
 */
export function fisherYatesShuffle<T>(input: T[], rng: RngFn = Math.random): T[] {
  const arr = input.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export interface QuizOption {
  text: string;
  isCorrect: boolean;
}

export interface BuiltQuestion {
  options: QuizOption[]; // toujours 4, dans l'ordre d'affichage A/B/C/D
  correctIndex: number; // 0 à 3
}

/**
 * Construit les 4 options d'une question à partir du bon effet + des 3
 * mauvaises réponses (déjà générées et validées à l'avance, jamais en
 * direct). `letterUsageCount` = nombre de fois où chaque position (0=A,
 * 1=B, 2=C, 3=D) a déjà été la bonne réponse dans la partie en cours —
 * permet d'équilibrer la distribution sur une partie (section 4) tout en
 * gardant un VRAI Fisher-Yates : on retire jusqu'à 3 fois (rejection
 * sampling) si le tirage retombe sur la position la plus déjà utilisée,
 * jamais un placement déterministe/prévisible.
 */
export function buildQuestion(
  correctText: string,
  wrongTexts: [string, string, string],
  letterUsageCount: [number, number, number, number] = [0, 0, 0, 0],
  rng: RngFn = Math.random
): BuiltQuestion {
  const base: QuizOption[] = [
    { text: correctText, isCorrect: true },
    { text: wrongTexts[0], isCorrect: false },
    { text: wrongTexts[1], isCorrect: false },
    { text: wrongTexts[2], isCorrect: false },
  ];

  let shuffled = fisherYatesShuffle(base, rng);
  let correctIndex = shuffled.findIndex((o) => o.isCorrect);

  const maxUsage = Math.max(...letterUsageCount);
  const minUsage = Math.min(...letterUsageCount);
  const isImbalanced = maxUsage - minUsage >= 2; // écart réel avant de corriger, pas au premier tour

  if (isImbalanced) {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (letterUsageCount[correctIndex] < maxUsage) break; // pas la lettre la plus utilisée, on garde ce tirage
      shuffled = fisherYatesShuffle(base, rng);
      correctIndex = shuffled.findIndex((o) => o.isCorrect);
    }
  }

  return { options: shuffled, correctIndex };
}

// --- Mode Millionnaire (section 7) ---
export const MILLIONAIRE_LADDER = [
  100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000, 1000000,
] as const;

// Index 0-based des paliers "sécurisés" (question 5 = index 4, question 10 = index 9).
export const SAFE_HAVEN_INDEXES = [4, 9] as const;

export function isSafeHaven(questionIndex: number): boolean {
  return (SAFE_HAVEN_INDEXES as readonly number[]).includes(questionIndex);
}

/** Palier garanti si le joueur s'arrête/échoue à `questionIndex` (0-based). */
export function guaranteedScore(questionIndex: number): number {
  for (let i = questionIndex - 1; i >= 0; i--) {
    if (isSafeHaven(i)) return MILLIONAIRE_LADDER[i];
  }
  return 0;
}

/** Palier de difficulté (1, 2 ou 3) pour une position de question Millionnaire (0-based, 0 à 14). */
export function millionaireDifficultyTier(questionIndex: number): 1 | 2 | 3 {
  if (questionIndex < 5) return 1;
  if (questionIndex < 10) return 2;
  return 3;
}

// --- Validation des mauvaises réponses (section 6) ---
export interface ValidationIssue {
  code:
    | "duplicate_wrong_answers"
    | "wrong_matches_correct"
    | "missing_correct_answer"
    | "too_few_wrong_answers"
    | "empty_answer";
  detail: string;
}

function normalizeAnswer(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // accents
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Script de validation obligatoire (section 6) — détecte : deux réponses
 * identiques, une mauvaise réponse identique au vrai effet, une bonne
 * réponse absente, moins de 3 mauvaises réponses. Appelé à la génération
 * (avant d'enregistrer en base) ET testé (voir scripts/test-quiz-engine.ts)
 * — une carte qui échoue cette validation ne devient jamais "ready".
 */
export function validateAnswerSet(correctText: string, wrongTexts: string[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!correctText || !correctText.trim()) {
    issues.push({ code: "missing_correct_answer", detail: "Aucun texte d'effet officiel fourni." });
  }
  if (wrongTexts.some((w) => !w || !w.trim())) {
    issues.push({ code: "empty_answer", detail: "Une mauvaise réponse est vide." });
  }
  if (wrongTexts.length < 3) {
    issues.push({ code: "too_few_wrong_answers", detail: `Seulement ${wrongTexts.length} mauvaise(s) réponse(s), 3 attendues.` });
  }

  const normalizedCorrect = normalizeAnswer(correctText);
  const normalizedWrongs = wrongTexts.map(normalizeAnswer);

  normalizedWrongs.forEach((w, i) => {
    if (w && w === normalizedCorrect) {
      issues.push({ code: "wrong_matches_correct", detail: `Mauvaise réponse #${i + 1} identique au vrai effet après normalisation.` });
    }
  });

  for (let i = 0; i < normalizedWrongs.length; i++) {
    for (let j = i + 1; j < normalizedWrongs.length; j++) {
      if (normalizedWrongs[i] && normalizedWrongs[i] === normalizedWrongs[j]) {
        issues.push({ code: "duplicate_wrong_answers", detail: `Mauvaises réponses #${i + 1} et #${j + 1} identiques après normalisation.` });
      }
    }
  }

  return issues;
}
