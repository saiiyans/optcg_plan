/**
 * Mapping couleur -> teinte, source unique pour toute pastille de couleur
 * OPTCG dans l'app (refonte — cohérence demandée entre Cartes, Leaders et
 * les outils de méta : même code couleur partout, pas une palette par page).
 */
export const OP_COLOR_HEX: Record<string, string> = {
  Red: "#E63946",
  Green: "#22C55E",
  Blue: "#3B82F6",
  Purple: "#A855F7",
  Black: "#6B7280",
  Yellow: "#EAB308",
};

export const OP_COLORS = ["Red", "Green", "Blue", "Purple", "Black", "Yellow"] as const;

/** Résout une couleur (insensible à la casse, gère "Red/Black" multicolore -> première couleur). */
export function opColorHex(color: string | null | undefined): string {
  if (!color) return "#98A2B3"; // steel — couleur inconnue/non renseignée
  const first = color.split("/")[0].trim();
  const match = Object.keys(OP_COLOR_HEX).find((k) => k.toLowerCase() === first.toLowerCase());
  return match ? OP_COLOR_HEX[match] : "#98A2B3";
}
