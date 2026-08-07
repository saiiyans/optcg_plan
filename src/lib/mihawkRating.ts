import type { ScrapedCard } from "./scraper";

export interface MihawkRatingResult {
  autoStars: number; // 0 à 5
  justification: string;
  confidence: "élevé" | "moyen" | "données insuffisantes";
  recommendedCount: number; // 0 à 4
  signals: string[]; // liste des critères qui ont compté, pour transparence
}

/**
 * Calcule une note 0-5 de compatibilité avec le Leader Dracule Mihawk
 * (OP14-020), à partir des critères listés par l'utilisateur :
 * attribut Slash, coût ≤5, jouable par Mihawk ST32-003, capacité à reposer
 * une carte, à reposer un perso adverse, effet anti-relève, réactivation de
 * DON!!, pioche/recherche, Counter +2000, puissance, protection, pression
 * offensive, courbe de DON!!, synergie Perona/Coffin Boat, légalité.
 *
 * Ce score est un point de départ éditable — jamais une vérité absolue.
 * Il est toujours accompagné d'une justification et d'un niveau de
 * confiance, et l'utilisateur peut le corriger manuellement à tout moment
 * (voir isManualOverride dans le modèle PersonalRating).
 */
export function computeMihawkRating(card: ScrapedCard): MihawkRatingResult {
  let score = 0;
  const signals: string[] = [];
  const text = `${card.officialText ?? ""} ${card.triggerText ?? ""}`.toLowerCase();

  // Légalité : une carte illégale en Standard ne peut pas obtenir plus de 0.
  const illegal = card.legalityStatus?.toLowerCase().includes("standard: illegal");
  if (illegal) {
    return {
      autoStars: 0,
      justification: "Carte non légale en format Standard — exclue automatiquement.",
      confidence: "élevé",
      recommendedCount: 0,
      signals: ["illégale en Standard"],
    };
  }

  if (card.attribute?.toLowerCase() === "slash") {
    score += 1;
    signals.push("Attribut Tranchant (Slash) — bonus de +1000 sous Mihawk");
  }
  if (card.cost !== null && card.cost <= 5) {
    score += 0.5;
    signals.push("Coût ≤5 — cohérent avec la courbe de DON!! de Mihawk");
  }
  if (/mihawk/.test(card.name.toLowerCase()) && /st32-003/i.test(card.cardNumber)) {
    score += 1;
    signals.push("Jouable gratuitement par Mihawk ST32-003");
  }
  if (/you may rest (this|1 of your) card/.test(text) || /rest 1 of your cards?/.test(text)) {
    score += 0.5;
    signals.push("Peut reposer une de ses propres cartes — synergise avec l'effet leader");
  }
  if (/rest.*(opponent|your opponent).*character/.test(text)) {
    score += 1;
    signals.push("Repose un personnage adverse — pression tempo");
  }
  if (/cannot be rested|does not become active/.test(text)) {
    score += 0.5;
    signals.push("Empêche une carte adverse de se relever");
  }
  if (/set.*don.*active|set up to.*don/.test(text)) {
    score += 1;
    signals.push("Réactive du DON!! — synergise directement avec l'effet leader Mihawk");
  }
  if (/draw \d+ card/.test(text)) {
    score += 0.5;
    signals.push("Pioche — consistance");
  }
  if (/look at.*top.*(card|deck)|reveal up to/.test(text)) {
    score += 0.5;
    signals.push("Recherche dans le deck — consistance (façon Perona)");
  }
  if (card.counter !== null && card.counter >= 2000) {
    score += 0.5;
    signals.push("Counter +2000 — défense fiable");
  }
  if (card.power !== null && card.power >= 6000) {
    score += 0.5;
    signals.push("Puissance élevée — pression offensive directe");
  }
  if (/instead of being ko|prevent.*k\.o\.|protect/.test(text)) {
    score += 0.5;
    signals.push("Effet de protection");
  }
  if (/perona/.test(text)) {
    score += 0.5;
    signals.push("Synergie explicite avec Perona");
  }
  if (/coffin boat/.test(text)) {
    score += 0.5;
    signals.push("Synergie explicite avec Coffin Boat");
  }

  const autoStars = Math.max(0, Math.min(5, Math.round(score * 2) / 2));

  // Niveau de confiance : basé sur la quantité de texte exploitable.
  let confidence: MihawkRatingResult["confidence"] = "moyen";
  if (!card.officialText && !card.triggerText) confidence = "données insuffisantes";
  else if (signals.length >= 3) confidence = "élevé";

  const recommendedCount =
    autoStars >= 4.5 ? 4 : autoStars >= 3.5 ? 3 : autoStars >= 2 ? 2 : autoStars >= 1 ? 1 : 0;

  const justification = signals.length
    ? `Score basé sur : ${signals.join(" ; ")}.`
    : "Aucun signal de synergie explicite détecté avec Mihawk dans le texte de la carte — à vérifier manuellement.";

  return { autoStars, justification, confidence, recommendedCount, signals };
}
