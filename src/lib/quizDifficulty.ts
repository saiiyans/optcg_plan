/**
 * Niveau de difficulté (1 à 3) d'une carte pour le Quiz des effets — une
 * CATÉGORISATION calculée depuis la longueur/complexité du texte officiel
 * réel, jamais une donnée de jeu inventée. Sert uniquement à répartir les
 * questions du mode Millionnaire (1-5 faciles, 6-10 intermédiaires, 11-15
 * complexes, section 7) et les filtres du mode Entraînement.
 */

const CONDITIONAL_WORDS = /\b(if|may|each|up to|unless|instead|then|during|other than)\b/gi;
const KEYWORD_BRACKETS = /\[[^\]]+\]/g;

export function computeDifficulty(officialText: string | null | undefined): 1 | 2 | 3 {
  if (!officialText) return 1;
  const text = officialText.trim();
  const length = text.length;
  const keywordCount = (text.match(KEYWORD_BRACKETS) ?? []).length;
  const conditionalCount = (text.match(CONDITIONAL_WORDS) ?? []).length;

  // Score composite simple : texte long + plusieurs mots-clés d'activation
  // + plusieurs clauses conditionnelles = effet réellement plus dur à
  // mémoriser mot pour mot, pas juste "carte rare = difficile".
  const score = length / 40 + keywordCount * 1.5 + conditionalCount;

  if (score < 6) return 1;
  if (score < 12) return 2;
  return 3;
}
