import type { ScrapedCard } from "./scraper";

export interface ShanksRatingResult {
  autoStars: number;
  justification: string;
  confidence: "élevé" | "moyen" | "données insuffisantes";
  recommendedCount: number;
  signals: string[];
}

/**
 * Calcule une note 0-5 de compatibilité avec le Leader Shanks (OP17), à
 * partir des mécaniques connues de son package Red-Haired Pirates :
 * type Red-Haired Pirates, Rush, verrouillage d'une carte adverse reposée
 * (écho de l'effet leader), protection des cartes Red-Haired Pirates,
 * pioche/recherche, Counter +2000, puissance, légalité.
 *
 * OP17 n'étant pas encore sorti (22 août 2026), très peu de cartes
 * correspondront à ces critères tant que le set n'est pas importé — c'est
 * normal, pas une erreur. Comme pour Mihawk, cette note reste un point de
 * départ éditable, jamais une vérité absolue.
 */
export function computeShanksRating(card: ScrapedCard): ShanksRatingResult {
  let score = 0;
  const signals: string[] = [];
  const text = `${card.officialText ?? ""} ${card.triggerText ?? ""}`.toLowerCase();
  const types = (card.types ?? "").toLowerCase();

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

  if (/red-haired pirates/.test(types)) {
    score += 1.5;
    signals.push("Type Red-Haired Pirates — cœur du package Shanks");
  }
  if (/east blue|straw hat crew/.test(types)) {
    score += 0.3;
    signals.push("Type East Blue / Straw Hat Crew — synergie croisée connue (ex. Nami OP17-023)");
  }
  if (card.cost !== null && card.cost <= 5) {
    score += 0.5;
    signals.push("Coût ≤5 — cohérent avec une courbe de DON!! standard");
  }
  if (/<rush>|rush:/.test(text)) {
    score += 1;
    signals.push("Rush — peut attaquer dès son entrée en jeu");
  }
  if (/will not become active|cannot become active|does not become active/.test(text)) {
    score += 1;
    signals.push("Verrouille une carte adverse reposée — écho direct de l'effet leader Shanks");
  }
  if (/rest.*(opponent|your opponent).*character/.test(text)) {
    score += 1;
    signals.push("Repose un personnage adverse — pression tempo");
  }
  if (/instead of being ko|you may rest (this|1 of your) card(s)? instead|prevent.*k\.o\./.test(text)) {
    score += 0.5;
    signals.push("Protège une carte Red-Haired Pirates d'un retrait adverse");
  }
  if (/draw \d+ card/.test(text)) {
    score += 0.5;
    signals.push("Pioche — consistance");
  }
  if (/look at.*top.*(card|deck)|reveal up to/.test(text)) {
    score += 0.5;
    signals.push("Recherche dans le deck — consistance");
  }
  if (/set.*don.*active|set up to.*don/.test(text)) {
    score += 0.5;
    signals.push("Réactive du DON!!");
  }
  if (card.counter !== null && card.counter >= 2000) {
    score += 0.5;
    signals.push("Counter +2000 — défense fiable");
  }
  if (card.power !== null && card.power >= 8000) {
    score += 0.5;
    signals.push("Puissance élevée — finisseur potentiel");
  }

  const autoStars = Math.max(0, Math.min(5, Math.round(score * 2) / 2));

  let confidence: ShanksRatingResult["confidence"] = "moyen";
  if (!card.officialText && !card.triggerText) confidence = "données insuffisantes";
  else if (signals.length >= 3) confidence = "élevé";

  const recommendedCount =
    autoStars >= 4.5 ? 4 : autoStars >= 3.5 ? 3 : autoStars >= 2 ? 2 : autoStars >= 1 ? 1 : 0;

  const justification = signals.length
    ? `Score basé sur : ${signals.join(" ; ")}.`
    : "Aucun signal de synergie explicite détecté avec Shanks dans le texte de la carte — normal tant qu'OP17 n'est pas sorti, à revérifier après le 22 août.";

  return { autoStars, justification, confidence, recommendedCount, signals };
}
