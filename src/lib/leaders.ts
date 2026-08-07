export interface LeaderConfig {
  key: "mihawk" | "shanks";
  label: string; // affiché dans l'UI
  leaderContext: string; // clé utilisée dans PersonalRating.leaderContext
  leaderCardNumber: string;
  deckProfile: string; // slug utilisé par onepiecetopdecks.com pour filtrer les decklists
  badgeClass: string; // classe CSS pour le badge de couleur
  releaseNote?: string; // affiché tant qu'il n'y a pas encore de données de tournoi
}

export const LEADERS: LeaderConfig[] = [
  {
    key: "mihawk",
    label: "Mihawk OP14-020",
    leaderContext: "Mihawk OP14-020",
    leaderCardNumber: "OP14-020",
    deckProfile: "op14mihawk",
    badgeClass: "badge-green",
  },
  {
    key: "shanks",
    label: "Shanks OP17",
    leaderContext: "Shanks OP17",
    leaderCardNumber: "OP17-020",
    // Slug non confirmé : OP17 n'est pas encore sorti (22 août 2026). À vérifier
    // sur onepiecetopdecks.com dès que le format OP17 a sa propre page de decklists.
    deckProfile: "op17shanks",
    badgeClass: "badge-gold",
    releaseNote: "OP17 sort le 22 août 2026 (JP) — pas encore de résultats de tournoi disponibles avant cette date.",
  },
];

export function getLeader(key: string | null | undefined): LeaderConfig {
  return LEADERS.find((l) => l.key === key) ?? LEADERS[0];
}
