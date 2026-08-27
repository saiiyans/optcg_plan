export interface LeaderConfig {
  key: "mihawk";
  label: string; // affiché dans l'UI
  leaderContext: string; // clé utilisée dans PersonalRating.leaderContext
  leaderCardNumber: string;
  deckProfile: string; // slug utilisé par onepiecetopdecks.com pour filtrer les decklists
  badgeClass: string; // classe CSS pour le badge de couleur
  releaseNote?: string; // affiché tant qu'il n'y a pas encore de données de tournoi
}

// Shanks OP17 retiré (choix du joueur : ne sera finalement pas joué au
// tournoi) — Mihawk OP14-020 reste le seul leader suivi activement par
// l'app. Les anciennes parties déjà loguées avec "Shanks OP17" comme deck
// restent affichées normalement dans le Journal/Stats (données historiques,
// jamais supprimées), seul le choix pour de NOUVELLES parties disparaît.
export const LEADERS: LeaderConfig[] = [
  {
    key: "mihawk",
    label: "Mihawk OP14-020",
    leaderContext: "Mihawk OP14-020",
    leaderCardNumber: "OP14-020",
    deckProfile: "op14mihawk",
    badgeClass: "badge-green",
  },
];

export function getLeader(key: string | null | undefined): LeaderConfig {
  return LEADERS.find((l) => l.key === key) ?? LEADERS[0];
}
