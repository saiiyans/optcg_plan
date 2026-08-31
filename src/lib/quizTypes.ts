/**
 * Types partagés pour le Quiz des effets — dupliqués ici (plutôt
 * qu'importés depuis @prisma/client) uniquement parce que le client Prisma
 * généré dans CE bac à sable ne peut pas être régénéré (binaries.prisma.sh
 * bloqué en sortie réseau ici, voir notes de session) : le fichier
 * node_modules/.prisma/client/index.d.ts présent est un stub où
 * `PrismaClient` vaut littéralement `any`, ce qui rend tous les callbacks
 * .map()/.filter() implicitement "any" et fait échouer `tsc --noEmit`.
 *
 * Ces interfaces reflètent exactement les champs de prisma/schema.prisma.
 * Une fois annotées sur les variables recevant le résultat de
 * db.xxx.findMany(...), TypeScript retrouve un vrai typage même avec le
 * client stub — et restent structurellement compatibles avec le VRAI
 * client généré par Vercel au déploiement (`npm run build` y régénère le
 * client normalement), donc aucun risque de divergence en production.
 */

export interface QuizCardRow {
  id: string;
  cardNumber: string;
  difficulty: number;
  archetypesJson: string;
  metaScore: number;
  wrongAnswersJson: string | null;
  wrongAnswersMeta: string | null;
  explanationFr: string | null;
  status: string;
  incompleteReason: string | null;
  sourceNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuizMasteryRow {
  id: string;
  quizCardId: string;
  level: number;
  appearances: number;
  correct: number;
  incorrect: number;
  currentStreak: number;
  bestStreak: number;
  avgResponseMs: number | null;
  lastReviewedAt: Date | null;
  nextReviewAt: Date | null;
  wrongAnswersPickedJson: string;
  updatedAt: Date;
}

export interface QuizCardWithMastery extends QuizCardRow {
  mastery: QuizMasteryRow | null;
}

/** Sous-ensemble des champs Card utilisés côté quiz (jamais dupliqués en base — toujours lus depuis Card via cardNumber). */
export interface QuizCardInfoLite {
  cardNumber: string;
  color: string;
  category: string;
}

export interface CardForQuiz {
  id: string;
  cardNumber: string;
  name: string;
  category: string;
  color: string;
  cost: number | null;
  power: number | null;
  counter: number | null;
  attribute: string | null;
  types: string;
  officialText: string | null;
  officialTextFr: string | null;
  triggerText: string | null;
  imageUrl: string;
  localImagePath: string | null;
  manuallyEditedFields: string | null;
}

export interface QuizSessionRow {
  id: string;
  mode: string;
  startedAt: Date;
  finishedAt: Date | null;
  questionsTotal: number;
  questionsCorrect: number;
  scoreReached: number;
  endedByError: boolean;
  avgResponseMs: number | null;
  jokersUsedJson: string;
  trainingFilterJson: string | null;
}

export interface QuizAttemptRow {
  id: string;
  sessionId: string;
  cardNumber: string;
  correct: boolean;
  selectedIndex: number;
  correctIndex: number;
  responseMs: number | null;
  jokerUsed: string | null;
  questionOrder: number;
  createdAt: Date;
}

export interface QuizAttemptWithSessionDate {
  cardNumber: string;
  correct: boolean;
  session: { startedAt: Date };
}

/**
 * Question déjà entièrement construite, telle que renvoyée par
 * /api/quiz/session et /api/quiz/joker — c'est la seule forme que le
 * client (pages src/app/quiz/**) manipule, jamais les modèles Prisma
 * bruts. Volontairement plate (pas de sous-objet "card"/"quizCard") pour
 * rester simple à consommer côté UI.
 */
export interface QuizQuestion {
  order: number;
  cardNumber: string;
  name: string;
  category: string;
  color: string;
  cost: number | null;
  power: number | null;
  counter: number | null;
  attribute: string | null;
  types: string;
  imageUrl: string | null;
  officialText: string | null;
  officialTextFr: string | null;
  triggerText: string | null;
  explanationFr: string | null;
  difficulty: number;
  difficultyTier: number;
  options: string[];
  correctIndex: number;
}
