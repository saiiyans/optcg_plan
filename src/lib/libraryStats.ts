import { db } from "./db";
import { MIHAWK_REFERENCE_DECK, totalDeckCount } from "./deckReference";
import { getLeader } from "./leaders";

export interface LibraryStats {
  totalGreenCards: number; // références uniques importées (toutes catégories confondues)
  totalAllCards: number; // toutes couleurs confondues
  cardsWithImage: number; // références avec une image (donc bien affichables partout)
  cardsWithoutImage: number;
}

export interface DeckStats {
  uniqueReferences: number; // nombre de cartes différentes dans ma decklist de référence
  totalExemplaires: number; // total d'exemplaires (somme des quantités), hors Leader
  recognizedReferences: number; // combien de ces références existent bien dans la Bibliothèque importée
}

export interface LeaderCardStats {
  fiveStarCount: number;
  inDeckCount: number; // 0 pour les leaders sans decklist de référence codée (ex. Shanks pour l'instant)
}

/**
 * Calcule le nombre de cartes vertes réellement en base — LA valeur de
 * référence pour "343 cartes vertes" affiché partout dans l'app. Toute page
 * qui affiche ce chiffre doit passer par cette fonction plutôt que refaire
 * sa propre requête, pour ne plus jamais avoir deux totaux différents.
 */
export async function computeLibraryStats(): Promise<LibraryStats> {
  const [totalGreenCards, totalAllCards, cardsWithImage] = await Promise.all([
    db.card.count({ where: { color: { contains: "Green", mode: "insensitive" } } }),
    db.card.count(),
    db.card.count({ where: { color: { contains: "Green", mode: "insensitive" }, imageUrl: { not: "" } } }),
  ]);
  return {
    totalGreenCards,
    totalAllCards,
    cardsWithImage,
    cardsWithoutImage: totalGreenCards - cardsWithImage,
  };
}

/**
 * Calcule les chiffres liés à MA decklist de référence Mihawk (celle codée
 * dans deckReference.ts) : combien de références distinctes, combien
 * d'exemplaires au total, et combien de ces références sont déjà
 * reconnues (= présentes) dans la Bibliothèque importée.
 */
export async function computeMyDeckStats(): Promise<DeckStats> {
  const uniqueReferences = MIHAWK_REFERENCE_DECK.cards.length;
  const totalExemplaires = totalDeckCount();
  const recognizedReferences = await db.card.count({
    where: { cardNumber: { in: MIHAWK_REFERENCE_DECK.cards.map((c) => c.cardNumber) } },
  });
  return { uniqueReferences, totalExemplaires, recognizedReferences };
}

export interface CoachProgress {
  deckReviewed: number;
  deckTotal: number;
  libraryReviewed: number;
  libraryTotal: number;
}

/**
 * Progression de la "Coach Knowledge Base" : combien de cartes du deck
 * actuel ont une analyse rédigée à la main, et combien sur l'ensemble de la
 * Bibliothèque. Ne compte jamais du contenu qui n'existe pas.
 */
export async function computeCoachProgress(): Promise<CoachProgress> {
  const deckNumbers = MIHAWK_REFERENCE_DECK.cards.map((c) => c.cardNumber);
  const [deckReviewed, libraryReviewed, libraryTotal] = await Promise.all([
    db.card.count({ where: { cardNumber: { in: deckNumbers }, coachReviewed: true } }),
    db.card.count({ where: { coachReviewed: true } }),
    db.card.count({ where: { color: { contains: "Green", mode: "insensitive" } } }),
  ]);
  return { deckReviewed, deckTotal: deckNumbers.length, libraryReviewed, libraryTotal };
}

/**
 * Stats par leader calculées entièrement en base (compteurs exacts) —
 * évite d'avoir à charger toutes les cartes côté client juste pour compter
 * les 5 étoiles ou celles présentes dans mon deck.
 */
export async function computeLeaderCardStats(leaderKey: string): Promise<LeaderCardStats> {
  const leader = getLeader(leaderKey);
  const fiveStarCount = await db.personalRating.count({
    where: { leaderContext: leader.leaderContext, stars: { gte: 5 } },
  });
  const inDeckCount =
    leader.key === "mihawk"
      ? await db.card.count({ where: { cardNumber: { in: MIHAWK_REFERENCE_DECK.cards.map((c) => c.cardNumber) } } })
      : 0;
  return { fiveStarCount, inDeckCount };
}
