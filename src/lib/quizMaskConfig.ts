/**
 * Zone masquée sur l'image de la carte pendant une question du Quiz des
 * effets (cahier des charges du 31/08/2026, section "mécanique de
 * question") : "l'image de la carte doit être affichée en grand avec
 * SEULEMENT la zone de texte d'effet masquée".
 *
 * Important — ce que ceci est et n'est PAS :
 *  - C'est un recouvrement CSS (voir QuizCardDisplay.tsx), jamais une
 *    modification de l'image source — le fichier/URL de l'image reste
 *    intact, exactement comme demandé.
 *  - Les coordonnées ci-dessous sont une approximation raisonnable basée
 *    sur la mise en page FIXE du gabarit officiel OPTCG par catégorie
 *    (le texte d'effet est toujours imprimé dans le même bandeau bas de
 *    carte pour les Leaders/Personnages/Stages, et sur une large moitié
 *    basse pour les Events) — PAS un calibrage pixel par pixel de chacune
 *    des 75 cartes candidates, qui demanderait d'inspecter chaque image
 *    une par une. Réglages exprimés en % de la hauteur/largeur de l'image
 *    pour rester valables quelle que soit la résolution de l'image
 *    chargée. Si une carte précise s'avère mal couverte à l'usage,
 *    ajuster son entrée ici (ou ajouter une entrée par cardNumber dans
 *    OVERRIDES) — c'est justement pour ça que c'est centralisé dans un
 *    seul fichier plutôt que codé en dur dans le composant d'affichage.
 */

export interface MaskRegion {
  top: string; // % depuis le haut de l'image
  height: string; // % de la hauteur de l'image
  insetX: string; // marge gauche/droite en %
}

const DEFAULT_REGIONS: Record<string, MaskRegion> = {
  Leader: { top: "63%", height: "24%", insetX: "6%" },
  Character: { top: "70%", height: "22%", insetX: "6%" },
  Stage: { top: "68%", height: "24%", insetX: "6%" },
  Event: { top: "34%", height: "58%", insetX: "6%" },
};

const FALLBACK_REGION: MaskRegion = { top: "60%", height: "30%", insetX: "6%" };

/** Ajustements ponctuels par carte, si le défaut par catégorie s'avère mal placé pour un visuel précis. */
const OVERRIDES: Record<string, MaskRegion> = {};

export function getMaskRegion(category: string, cardNumber?: string): MaskRegion {
  if (cardNumber && OVERRIDES[cardNumber]) return OVERRIDES[cardNumber];
  return DEFAULT_REGIONS[category] ?? FALLBACK_REGION;
}
