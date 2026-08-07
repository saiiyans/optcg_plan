import { MIHAWK_REFERENCE_DECK } from "./deckReference";

export interface DeckDiffRow {
  cardNumber: string;
  myQuantity: number;
  winningQuantity: number;
  difference: number; // winningQuantity - myQuantity (positif = à ajouter, négatif = à retirer)
}

export interface DeckComparison {
  identical: DeckDiffRow[]; // même carte, même quantité
  differentQuantity: DeckDiffRow[]; // les deux l'ont, quantité différente
  onlyInWinningDeck: DeckDiffRow[]; // absente de mon deck
  onlyInMyDeck: DeckDiffRow[]; // absente du deck gagnant

  identicalCount: number;
  differentQuantityCount: number;
  onlyInWinningCount: number;
  onlyInMyDeckCount: number;

  // Exemplaires réels (pas seulement le nombre de références distinctes)
  exemplairesToAdd: number;
  exemplairesToRemove: number;

  similarityPercent: number; // 0-100, basé sur les exemplaires en commun / total exemplaires du deck gagnant
}

/**
 * Compare une decklist gagnante importée avec la decklist de référence de
 * l'utilisateur. Ne modifie jamais la decklist personnelle — retourne
 * uniquement une comparaison à titre indicatif.
 *
 * Règle stricte : une carte que je possède déjà (myQuantity > 0) n'est
 * jamais classée dans "uniquement dans le deck gagnant", même si la
 * quantité diffère — elle va dans differentQuantity.
 */
export function compareWithMyDeck(winningCards: { cardNumber: string; quantity: number }[]): DeckComparison {
  const myMap = new Map<string, number>(MIHAWK_REFERENCE_DECK.cards.map((c) => [c.cardNumber, c.quantity]));
  const winMap = new Map(winningCards.map((c) => [c.cardNumber, c.quantity]));

  const allNumbers = new Set([...myMap.keys(), ...winMap.keys()]);
  const identical: DeckDiffRow[] = [];
  const differentQuantity: DeckDiffRow[] = [];
  const onlyInWinningDeck: DeckDiffRow[] = [];
  const onlyInMyDeck: DeckDiffRow[] = [];

  let exemplairesToAdd = 0;
  let exemplairesToRemove = 0;
  let sharedExemplaires = 0;
  const totalWinningExemplaires = winningCards.reduce((s, c) => s + c.quantity, 0);

  for (const cardNumber of allNumbers) {
    const myQuantity = myMap.get(cardNumber) ?? 0;
    const winningQuantity = winMap.get(cardNumber) ?? 0;
    const row: DeckDiffRow = { cardNumber, myQuantity, winningQuantity, difference: winningQuantity - myQuantity };

    if (myQuantity > 0 && winningQuantity > 0 && myQuantity === winningQuantity) {
      identical.push(row);
      sharedExemplaires += myQuantity;
    } else if (myQuantity > 0 && winningQuantity > 0 && myQuantity !== winningQuantity) {
      differentQuantity.push(row);
      sharedExemplaires += Math.min(myQuantity, winningQuantity);
      if (row.difference > 0) exemplairesToAdd += row.difference;
      else exemplairesToRemove += -row.difference;
    } else if (myQuantity === 0 && winningQuantity > 0) {
      onlyInWinningDeck.push(row);
      exemplairesToAdd += winningQuantity;
    } else if (myQuantity > 0 && winningQuantity === 0) {
      onlyInMyDeck.push(row);
      exemplairesToRemove += myQuantity;
    }
  }

  const similarityPercent = totalWinningExemplaires > 0 ? Math.round((sharedExemplaires / totalWinningExemplaires) * 1000) / 10 : 0;

  return {
    identical,
    differentQuantity,
    onlyInWinningDeck,
    onlyInMyDeck,
    identicalCount: identical.length,
    differentQuantityCount: differentQuantity.length,
    onlyInWinningCount: onlyInWinningDeck.length,
    onlyInMyDeckCount: onlyInMyDeck.length,
    exemplairesToAdd,
    exemplairesToRemove,
    similarityPercent,
  };
}
