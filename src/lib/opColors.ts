/**
 * Mapping couleur -> teinte, source unique pour toute pastille de couleur
 * OPTCG dans l'app (refonte — cohérence demandée entre Cartes, Leaders et
 * les outils de méta : même code couleur partout, pas une palette par page).
 * Valeurs relevées à l'identique sur les pastilles de filtre couleur de
 * nakamacompanion.com/collection (inspection des styles calculés réels).
 */
export const OP_COLOR_HEX: Record<string, string> = {
  Red: "#EF5350",
  Green: "#66BB6A",
  Blue: "#42A5F5",
  Purple: "#AB47BC",
  Black: "#757575",
  Yellow: "#FFEE58",
};

export const OP_COLORS = ["Red", "Green", "Blue", "Purple", "Black", "Yellow"] as const;

/** Résout une couleur (insensible à la casse, gère "Red/Black" multicolore -> première couleur). */
export function opColorHex(color: string | null | undefined): string {
  if (!color) return "#98A2B3"; // steel — couleur inconnue/non renseignée
  const first = color.split("/")[0].trim();
  const match = Object.keys(OP_COLOR_HEX).find((k) => k.toLowerCase() === first.toLowerCase());
  return match ? OP_COLOR_HEX[match] : "#98A2B3";
}

/**
 * Convertit un hex (#RRGGBB) en rgba(...) avec l'opacité demandée — sert à
 * reproduire l'état "actif" des pastilles de couleur de
 * nakamacompanion.com/collection (fond teinté à 15% de la couleur, bordure
 * pleine), qui n'est pas exprimable en Tailwind statique puisque la couleur
 * est dynamique (une par filtre).
 */
export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
