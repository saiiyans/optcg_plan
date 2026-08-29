import { db } from "./db";

/**
 * Statistiques de composition calculées à partir des vraies données de
 * carte (coût, counter, catégorie) — jamais de narratif stratégique
 * inventé ici, juste des chiffres réels. Utilisé par le sélecteur de
 * Deck Profile pour tout deck qui n'est pas la référence Mihawk (dont le
 * contenu narratif reste écrit à la main, spécifique à ce deck précis).
 */
export interface DeckCompositionCard {
  cardNumber: string;
  quantity: number;
  name: string | null;
  imageUrl: string | null;
  cost: number | null;
  counter: number | null;
  category: string | null;
}

export interface DeckComposition {
  totalCards: number;
  costCurve: Record<string, number>; // "0" à "10+" -> nombre d'exemplaires
  counter1000Count: number;
  counter2000Count: number;
  noCounterCount: number;
  cost5PlusCharacterCount: number;
  eventCount: number;
  characterCount: number;
  stageCount: number;
  cards: DeckCompositionCard[];
}

// Sous-ensemble des champs réels du modèle Card (prisma/schema.prisma) utilisés
// dans cette fonction. Annotation nécessaire dans cet environnement de dev : le
// client Prisma généré localement est un client "vide" (le générateur ne peut
// pas télécharger son moteur depuis binaries.prisma.sh, bloqué par le réseau du
// bac à sable), donc TS ne peut pas déduire seul le type renvoyé par
// db.card.findMany ici. Sur Vercel, où `prisma generate` tourne normalement
// avant le build, le vrai type Card (structurellement compatible avec ce
// sous-ensemble) est assigné sans problème — ce n'est pas un contournement qui
// devine le schéma, juste une copie fidèle des champs déclarés plus haut.
interface CardRow {
  cardNumber: string;
  name: string;
  imageUrl: string;
  localImagePath: string | null;
  cost: number | null;
  counter: number | null;
  category: string;
}

export async function computeDeckComposition(
  list: { cardNumber: string; quantity: number }[]
): Promise<DeckComposition> {
  const cardData: CardRow[] = await db.card.findMany({
    where: { cardNumber: { in: list.map((c) => c.cardNumber) } },
  });
  const byNumber = new Map(cardData.map((c) => [c.cardNumber, c] as const));

  const costCurve: Record<string, number> = {};
  let counter1000Count = 0;
  let counter2000Count = 0;
  let noCounterCount = 0;
  let cost5PlusCharacterCount = 0;
  let eventCount = 0;
  let characterCount = 0;
  let stageCount = 0;
  let totalCards = 0;

  const cards: DeckCompositionCard[] = [];

  for (const entry of list) {
    const card = byNumber.get(entry.cardNumber);
    totalCards += entry.quantity;

    const costKey = card?.cost != null ? (card.cost >= 10 ? "10+" : String(card.cost)) : "?";
    costCurve[costKey] = (costCurve[costKey] ?? 0) + entry.quantity;

    if (card?.counter === 1000) counter1000Count += entry.quantity;
    else if (card?.counter === 2000) counter2000Count += entry.quantity;
    else if (card?.category === "Character") noCounterCount += entry.quantity;

    if (card?.category === "Character" && card.cost != null && card.cost >= 5) cost5PlusCharacterCount += entry.quantity;
    if (card?.category === "Event") eventCount += entry.quantity;
    if (card?.category === "Character") characterCount += entry.quantity;
    if (card?.category === "Stage") stageCount += entry.quantity;

    cards.push({
      cardNumber: entry.cardNumber,
      quantity: entry.quantity,
      name: card?.name ?? null,
      imageUrl: card?.localImagePath || card?.imageUrl || null,
      cost: card?.cost ?? null,
      counter: card?.counter ?? null,
      category: card?.category ?? null,
    });
  }

  return {
    totalCards,
    costCurve,
    counter1000Count,
    counter2000Count,
    noCounterCount,
    cost5PlusCharacterCount,
    eventCount,
    characterCount,
    stageCount,
    cards,
  };
}
