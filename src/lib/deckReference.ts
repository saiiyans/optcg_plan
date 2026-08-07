/**
 * Decklist de référence transmise par l'utilisateur (50 cartes + 1 Leader).
 * Sert à poser le badge "Dans mon deck" et la quantité utilisée sur la
 * Green Card Library. Toute correction manuelle de cette liste doit être
 * faite ici, pas dans la base de notation automatique.
 */
export const MIHAWK_REFERENCE_DECK = {
  leader: { cardNumber: "OP14-020", name: "Dracule Mihawk", quantity: 1 },
  cards: [
    { cardNumber: "OP07-022", name: "Otama", quantity: 4 },
    { cardNumber: "OP12-034", name: "Perona", quantity: 4 },
    { cardNumber: "OP14-023", name: "Kikunojo", quantity: 4 },
    { cardNumber: "ST32-001", name: "Kin'emon", quantity: 4 },
    { cardNumber: "ST32-005", name: "Roronoa Zoro", quantity: 2 },
    { cardNumber: "OP10-030", name: "Smoker", quantity: 4 },
    { cardNumber: "OP14-033", name: "Perona", quantity: 3 },
    { cardNumber: "ST32-002", name: "Kouzuki Oden", quantity: 4 },
    { cardNumber: "OP13-031", name: "Trafalgar Law", quantity: 1 },
    { cardNumber: "ST32-003", name: "Dracule Mihawk", quantity: 4 },
    { cardNumber: "OP14-119", name: "Dracule Mihawk", quantity: 2 },
    { cardNumber: "ST24-004", name: "Law & Bepo", quantity: 3 },
    { cardNumber: "OP01-055", name: "You Can Be My Samurai!!!", quantity: 4 },
    { cardNumber: "OP06-038", name: "Billion-fold World Trichiliocosm", quantity: 2 },
    { cardNumber: "OP12-037", name: "Demonic Aura Nine-Sword Style Asura Dead Man's Game", quantity: 3 },
    { cardNumber: "OP13-040", name: "I Know You're Strong...So I'll Go All Out From the Start!!!", quantity: 1 },
    { cardNumber: "OP14-039", name: "Coffin Boat", quantity: 1 },
  ],
} as const;

export function totalDeckCount(): number {
  return MIHAWK_REFERENCE_DECK.cards.reduce((sum, c) => sum + c.quantity, 0);
}

export function findDeckQuantity(cardNumber: string): number {
  return (
    MIHAWK_REFERENCE_DECK.cards.find(
      (c) => c.cardNumber.toUpperCase() === cardNumber.toUpperCase()
    )?.quantity ?? 0
  );
}
