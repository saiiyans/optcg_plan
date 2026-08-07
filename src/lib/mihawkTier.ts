export interface MihawkTierResult {
  tier: "S+" | "S" | "A" | "B" | "C" | "D" | "F";
  score10: number; // note /10, dérivée des étoiles existantes (0-5 -> 0-10)
  color: string; // classe Tailwind
}

/**
 * Convertit la note 0-5 déjà calculée par mihawkRating.ts en tier lisible
 * S+ à F. Ne recalcule rien de nouveau — c'est une simple présentation
 * différente d'une donnée qui existe déjà, jamais une note inventée à part.
 */
export function toMihawkTier(stars: number): MihawkTierResult {
  const score10 = Math.round(stars * 2 * 10) / 10;
  if (stars >= 5) return { tier: "S+", score10, color: "text-gold" };
  if (stars >= 4) return { tier: "S", score10, color: "text-gold" };
  if (stars >= 3) return { tier: "A", score10, color: "text-emerald-bright" };
  if (stars >= 2) return { tier: "B", score10, color: "text-ivory" };
  if (stars >= 1) return { tier: "C", score10, color: "text-orange-400" };
  if (stars > 0) return { tier: "D", score10, color: "text-textMuted" };
  return { tier: "F", score10, color: "text-red-400" };
}

export interface CardForTags {
  attribute: string | null;
  counter: number | null;
  cost: number | null;
  power: number | null;
  types: string | null; // ex: "Animal/Wano" — traits scrapés tels quels
  cardNumber: string;
}

/**
 * Tags dérivés uniquement de champs structurés déjà scrapés (attribut,
 * coût, Counter, traits) — jamais du texte d'effet, pour ne rien inventer
 * ni reproduire.
 */
export function deriveMihawkTags(card: CardForTags): string[] {
  const tags: string[] = [];
  if (card.attribute?.toLowerCase() === "slash") tags.push("SLASH");
  if (card.counter !== null && card.counter >= 2000) tags.push("2K COUNTER");
  else if (card.counter !== null && card.counter >= 1000) tags.push("1K COUNTER");
  if (card.types?.toLowerCase().includes("wano")) tags.push("WANO");
  if (card.cost !== null && card.cost <= 3) tags.push("LOW COST");
  if (card.cost !== null && card.cost >= 8) tags.push("BOSS");
  if (card.power !== null && card.power >= 7000) tags.push("HIGH POWER");
  if (card.counter === null || card.counter === 0) tags.push("NO COUNTER");
  if (/^st32-003/i.test(card.cardNumber)) tags.push("MIHAWK ENABLER");
  return tags;
}
