import { db } from "@/lib/db";
import { fisherYatesShuffle } from "@/lib/quizEngine";
import type { QuizCardWithMastery, QuizCardInfoLite } from "@/lib/quizTypes";

export interface TrainingFilters {
  color?: string; // "Green" | "Red" | ... | undefined = toutes
  archetype?: string;
  difficulty?: 1 | 2 | 3;
  leadersOnly?: boolean;
  scope?: "all" | "due_today" | "never_studied" | "weakest" | "mistakes";
}

/**
 * Sélectionne un lot de QuizCard prêtes (status="ready"), sans jamais
 * répéter une carte dans le même lot (section 16 : "empêche une carte
 * d'apparaître deux fois dans une même partie"). `excludeCardNumbers`
 * permet aussi d'exclure les cartes déjà utilisées dans une session en
 * cours de construction (ex. joker "Changer de carte").
 */
export async function selectQuizCards(
  count: number,
  filters: TrainingFilters = {},
  excludeCardNumbers: string[] = []
): Promise<{ cardNumber: string; difficulty: number; masteryLevel: number; nextReviewAt: Date | null }[]> {
  const where: Record<string, any> = { status: "ready" };
  if (filters.difficulty) where.difficulty = filters.difficulty;
  if (excludeCardNumbers.length > 0) where.cardNumber = { notIn: excludeCardNumbers };

  const quizCards: QuizCardWithMastery[] = await db.quizCard.findMany({
    where,
    include: { mastery: true },
  });

  let pool: QuizCardWithMastery[] = quizCards;

  if (filters.archetype) {
    pool = pool.filter((c) => {
      try {
        const archetypes: string[] = JSON.parse(c.archetypesJson || "[]");
        return archetypes.some((a) => a.toLowerCase() === filters.archetype!.toLowerCase());
      } catch {
        return false;
      }
    });
  }

  // color / leadersOnly nécessitent les infos Card (couleur, catégorie) —
  // récupérées en un seul appel groupé plutôt qu'une requête par carte.
  if (filters.color || filters.leadersOnly) {
    const cardRows: QuizCardInfoLite[] = await db.card.findMany({
      where: { cardNumber: { in: pool.map((c) => c.cardNumber) } },
      select: { cardNumber: true, color: true, category: true },
    });
    const byNumber = new Map(cardRows.map((c) => [c.cardNumber, c]));
    pool = pool.filter((c) => {
      const info = byNumber.get(c.cardNumber);
      if (!info) return false;
      if (filters.leadersOnly && info.category !== "Leader") return false;
      if (filters.color && !info.color.toLowerCase().includes(filters.color.toLowerCase())) return false;
      return true;
    });
  }

  const now = new Date();
  if (filters.scope === "due_today") {
    pool = pool.filter((c) => !c.mastery || !c.mastery.nextReviewAt || c.mastery.nextReviewAt <= now);
  } else if (filters.scope === "never_studied") {
    pool = pool.filter((c) => !c.mastery || c.mastery.appearances === 0);
  } else if (filters.scope === "weakest") {
    pool = pool
      .filter((c) => c.mastery && c.mastery.appearances > 0)
      .sort((a, b) => (a.mastery!.level ?? 0) - (b.mastery!.level ?? 0));
  } else if (filters.scope === "mistakes") {
    pool = pool.filter((c) => c.mastery && c.mastery.incorrect > 0);
  }

  // Priorise les cartes les moins maîtrisées / dues (section 11 : "les
  // cartes mal maîtrisées doivent apparaître plus souvent"), tout en
  // gardant une part de vrai hasard (Fisher-Yates) plutôt qu'un tri
  // strictement déterministe qui rendrait chaque session identique.
  const weighted = pool
    .map((c) => ({ c, weight: 6 - (c.mastery?.level ?? 0) })) // niveau 0 -> poids 6, niveau 5 -> poids 1
    .flatMap(({ c, weight }) => Array(Math.max(1, weight)).fill(c));

  const shuffled = fisherYatesShuffle(weighted);
  const seen = new Set<string>();
  const picked: typeof pool = [];
  for (const c of shuffled) {
    if (seen.has(c.cardNumber)) continue;
    seen.add(c.cardNumber);
    picked.push(c);
    if (picked.length >= count) break;
  }

  return picked.map((c) => ({
    cardNumber: c.cardNumber,
    difficulty: c.difficulty,
    masteryLevel: c.mastery?.level ?? 0,
    nextReviewAt: c.mastery?.nextReviewAt ?? null,
  }));
}

/** Sélection Millionnaire : 5 cartes difficulté 1, 5 difficulté 2, 5 difficulté 3, aucun doublon. */
export async function selectMillionaireDeck(): Promise<string[]> {
  const tiers: (1 | 2 | 3)[] = [1, 2, 3];
  const used: string[] = [];
  for (const tier of tiers) {
    let picked = await selectQuizCards(5, { difficulty: tier }, used);
    if (picked.length < 5) {
      // Pas assez de cartes à cette difficulté exacte (base encore petite,
      // voir quizCandidates.ts) : complète avec n'importe quelle carte
      // "ready" pas déjà utilisée plutôt que de bloquer la partie.
      const extra = await selectQuizCards(5 - picked.length, {}, [...used, ...picked.map((p) => p.cardNumber)]);
      picked = [...picked, ...extra];
    }
    used.push(...picked.map((p) => p.cardNumber));
  }
  return used;
}
