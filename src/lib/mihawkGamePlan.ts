/**
 * Plan de jeu Mihawk OP14-020, synthétisé à partir de guides stratégiques
 * communautaires (niveau 3 — "Conseil stratégique", jamais présenté comme
 * une règle officielle). Chaque section cite sa source ; à tester et
 * ajuster au feeling en partie, conformément aux règles du projet.
 *
 * Sources consultées (toutes niveau 3, communautaires) :
 * - onepiece.gg, "Green Mihawk Guide: Best Decks & Strategy (OP14)",
 *   par Raphterra (joueur compétitif classé), 25/12/2025
 *   https://onepiece.gg/green-mihawk-guide-best-decks-strategy-op14/
 * - Spell Mana, "Green Dracule Mihawk Deck Guide", 22/12/2025
 *   https://spellmana.com/green-dracule-mihawk-deck-guide-one-piece-card-game/
 * - Limitless TCG, page deck Green Mihawk (résultats de tournois observés)
 *   https://onepiece.limitlesstcg.com/decks/86
 * - Raphterra (X/Twitter), tier list de matchups Green Mihawk OP14,
 *   29/01/2026 — un seul auteur, à prendre comme observation isolée
 *   https://x.com/Raphterra/status/2016896234846617953
 * Dernière vérification : voir date de récupération dans l'app.
 */

export const MIHAWK_SOURCES = [
  {
    name: "onepiece.gg — Green Mihawk Guide (Raphterra)",
    url: "https://onepiece.gg/green-mihawk-guide-best-decks-strategy-op14/",
    date: "2025-12-25",
  },
  {
    name: "Spell Mana — Green Dracule Mihawk Deck Guide",
    url: "https://spellmana.com/green-dracule-mihawk-deck-guide-one-piece-card-game/",
    date: "2025-12-22",
  },
  {
    name: "Limitless TCG — Green Mihawk, résultats de tournois",
    url: "https://onepiece.limitlesstcg.com/decks/86",
    date: "en continu",
  },
  {
    name: "Raphterra (X) — tier list de matchups Green Mihawk OP14",
    url: "https://x.com/Raphterra/status/2016896234846617953",
    date: "2026-01-29",
  },
  {
    name: "OPTCG.gg — Top Decks (résultats récents)",
    url: "https://www.optcg.gg/deck-lists/top-decks",
    date: "2026-08-19",
  },
  {
    name: "Spellmana — OP17 Meta Tier List (preview pré-sortie)",
    url: "https://spellmana.com/one-piece-card-game-op17-meta-tier-list-optcg-best-decks/",
    date: "2026-08 (avant sortie OP17)",
  },
  {
    name: "OPMerchandise (X) — décklist ST32 (Dracule Mihawk ST32-003)",
    url: "https://x.com/OPMerchandise/status/2073446851483951406",
    date: "2026-07",
  },
];

/**
 * Actualités Mihawk — recherchées le 22/08/2026. Chaque entrée cite sa
 * source et son niveau de confiance ; rien ici n'est présenté comme un
 * fait établi si ce n'est qu'une preview pré-sortie ou un avis isolé.
 * OP17 sort le 28/08/2026 — à cette date de recherche, aucun résultat de
 * tournoi post-OP17 n'existe encore pour Mihawk.
 */
export interface MihawkNewsItem {
  date: string;
  title: string;
  note: string;
  confidence: "Résultat de tournoi" | "Confirmé (révélation officielle)" | "Spéculation pré-sortie" | "Donnée agrégée (ladder en ligne)";
  source: string;
}

export const MIHAWK_NEWS: MihawkNewsItem[] = [
  {
    date: "2026-08-27",
    title: "Mihawk #5 du classement méta actuel (cardkaizoku.com)",
    note: "Filtre \"OP17 Last Week, All Lobbies\" (1 945 366 parties recensées sur la période) : winrate pondéré 51,89%, taux de jeu 10,36% — 2ᵉ leader le plus joué du format, juste derrière Sabo, et en hausse d'un rang sur la semaine. Donnée agrégée de ladder en ligne, pas des résultats de tournoi officiels — détail complet et classement des 10 leaders les plus joués dans l'onglet Matchups.",
    confidence: "Donnée agrégée (ladder en ligne)",
    source: "cardkaizoku.com/ranking",
  },
  {
    date: "2026-08-26",
    title: "ChinoizeCup #101 & #102 — 1ère place puis 5 decks Mihawk en top 8",
    note: "ChinoizeCup #101 (25/08/2026) : Mihawk Vert (OP14-020) 1er, 225,28$ de gains. ChinoizeCup #102 (26/08/2026, lendemain) : Mihawk prend 5 des 8 places du top 8 (2e, 3e, 6e, 7e, 8e). Deux cups locales consécutives, pas des événements majeurs, mais un signal fort et très récent (post-OP17) sur la solidité du deck.",
    confidence: "Résultat de tournoi",
    source: "OPTCG.gg",
  },
  {
    date: "2026-08-19",
    title: "ChinoizeCup #99 — deux Mihawk Vert classés",
    note: "7e place (\"Dracule Mihawk - FenoHS\") et 9e place (\"Dracule Mihawk - Brian\") — un cup local, pas un événement majeur, mais le résultat le plus récent trouvé.",
    confidence: "Résultat de tournoi",
    source: "OPTCG.gg",
  },
  {
    date: "mi-2026, en continu",
    title: "Résultats agrégés en Regionals / Treasure Cup",
    note: "9e à la Treasure Cup Utrecht, 23e aux Regionals Wolverhampton et Bielefeld, 6e au Regional Toronto, 4e au Regional Warsaw. Un deck stable et compétitif, milieu-haut de tableau, jamais dominant mais jamais hors-course.",
    confidence: "Résultat de tournoi",
    source: "Limitless TCG",
  },
  {
    date: "juillet 2026",
    title: "Nouvelle carte de soutien : Dracule Mihawk ST32-003",
    note: "Le starter deck Green Zoro (ST32) inclut 2 exemplaires de Mihawk comme personnage de soutien, jouable aussi dans un deck Mihawk leader — pas de recommandation de run count officielle trouvée, à tester toi-même avant de l'ajouter en nombre.",
    confidence: "Confirmé (révélation officielle)",
    source: "OPMerchandise (X)",
  },
  {
    date: "août 2026, avant sortie OP17",
    title: "Positionnement A-tier pour OP17 — pas encore vérifié",
    note: "Une preview classe Green Mihawk en A-tier pour OP17, en s'appuyant sur le bonus +1000 déjà connu face aux leaders Tranchant (favorable contre Zoro Vert notamment). OP17 sort le 28/08/2026 : aucun résultat de tournoi ne confirme encore cette évaluation à ce jour — à traiter comme une hypothèse, pas un fait.",
    confidence: "Spéculation pré-sortie",
    source: "Spellmana (preview OP17)",
  },
];

export const MIHAWK_GAME_PLAN = {
  summary:
    "Deck tempo/contrôle : ralentir l'adversaire (repos de personnages, réduction de puissance, blocage) pendant que tu construis un board difficile à retirer, jusqu'à pouvoir enchaîner une grosse attaque. L'effet leader (reposer 1 carte pour activer 3 DON!! si un perso coût 5+ est en jeu, puis plus de perso jouable ce tour) est le moteur de tempo central — presque tout le deck existe pour l'activer proprement.",
  winCondition:
    "Pas un deck de rush pur : tu gagnes en empêchant l'adversaire d'attaquer efficacement (personnages verrouillés/affaiblis) pendant que tes attaquants protégés (Tashigi, Shanks, Mihawk 9 coût) grignotent la vie adverse sur plusieurs tours.",
};

export interface MihawkCardNote {
  cardNumber: string;
  role: string;
  note: string;
  runCount: string; // ex. "4 copies recommandées"
}

export const MIHAWK_CORE_CARDS: MihawkCardNote[] = [
  {
    cardNumber: "OP12-034",
    role: "Chercheuse universelle (Perona 1 coût)",
    note: "Cherche un perso Tranchant ou un Event vert parmi les 5 cartes du dessus — trouve quasiment toujours quelque chose vu la construction du deck. Bonne cible à reposer pour l'effet leader une fois son effet utilisé.",
    runCount: "4 copies recommandées",
  },
  {
    cardNumber: "OP14-039",
    role: "Stage — moteur de tempo (Coffin Boat)",
    note: "Pioche 1 carte à l'entrée, redonne 1 DON!! actif en fin de tour. Cible idéale à reposer pour l'effet leader : ça n'affaiblit jamais ton board, contrairement à reposer un personnage.",
    runCount: "0-4 copies selon la liste",
  },
  {
    cardNumber: "OP14-023",
    role: "Counter 2000 cherchable (Kikunojo)",
    note: "Se réactive toute seule en fin de tour — ne peut pas être neutralisée définitivement par une attaque adverse.",
    runCount: "0-4 copies",
  },
  {
    cardNumber: "OP14-032",
    role: "Counter 2000 cherchable + contrôle (Humandrill)",
    note: "En la reposant (via l'effet leader par exemple), tu reposes aussi 1 perso adverse coût 4 ou moins — utile contre les Blockers bon marché.",
    runCount: "0-4 copies",
  },
  {
    cardNumber: "OP14-029",
    role: "Attaquant milieu de partie (Tashigi, 5 coût)",
    note: "Peut se protéger d'un retrait en reposant n'importe quelle carte à toi, et peut se booster à +2000 (8000 de puissance) en reposant 2 cartes. Coûte pile 5, donc active directement l'effet leader le tour où elle est jouée. Cible prioritaire pour recevoir les 3 DON!! du leader.",
    runCount: "3-4 copies recommandées",
  },
  {
    cardNumber: "OP14-027",
    role: "Contrôle défensif (Shanks 7 coût)",
    note: "Repose 1 perso adverse (puissance de base ≤7000) quand il devient reposé, et inflige -1000 à tous les persos adverses tant qu'il est reposé lui-même. Avec 2 exemplaires en jeu, le cumul de -1000 devient très difficile à percer pour l'adversaire.",
    runCount: "0-4 copies",
  },
  {
    cardNumber: "OP14-119",
    role: "Finisseur fin de partie (Mihawk 9 coût)",
    note: "Empêche 1 perso adverse (coût ≤9) de se réactiver tant qu'il reste reposé — verrouille un boss clé. Se joue bien tôt via l'effet leader pour verrouiller immédiatement une menace.",
    runCount: "0-4 copies",
  },
  {
    cardNumber: "ST24-004",
    role: "Finisseur fin de partie (Law & Bepo)",
    note: "Repose 1 perso adverse qui ne se réactivera pas au prochain Refresh ; si l'adversaire a déjà 2+ persos reposés, ton leader gagne +2000 jusqu'à la fin de son tour suivant (Mihawk passe à 7000).",
    runCount: "4 copies recommandées",
  },
];

export const MIHAWK_MULLIGAN = {
  goingFirst:
    "Garder une main avec Coffin Boat + Perona 1 coût, et idéalement Tashigi (5 coût), Shanks (7 coût) ou Law (6 coût) pour la suite de la courbe.",
  goingSecond:
    "Même base (Coffin Boat + Perona 1 coût), avec Perona 5 coût ou Tashigi comme suite, puis Law 6 coût.",
};

export const MIHAWK_TURN_GUIDE = {
  goingFirst: [
    { turn: 1, don: 1, play: "Coffin Boat ou Perona 1 coût" },
    { turn: 2, don: 3, play: "Coffin Boat ou Perona 1 coût (celui non joué au tour 1)" },
    { turn: 3, don: 5, play: "Tashigi (5 coût)" },
    { turn: 4, don: 7, play: "Law (6 coût) ou Shanks (7 coût)" },
    { turn: 5, don: 9, play: "Mihawk 9 coût" },
    { turn: 6, don: 10, play: "Mihawk 9 coût ou Law & Bepo (10 coût)" },
  ],
  goingSecond: [
    { turn: 1, don: 2, play: "Coffin Boat ou Perona 1 coût" },
    { turn: 2, don: 4, play: "Zoro 4 coût" },
    { turn: 3, don: 6, play: "Law 6 coût" },
    { turn: 4, don: 8, play: "Shanks (7 coût) ou Law 6 coût" },
    { turn: 5, don: 10, play: "Mihawk 9 coût ou Law & Bepo (10 coût)" },
  ],
};

export const MIHAWK_PRINCIPLES: string[] = [
  "Protéger les pièces clés (Tashigi, Shanks, Mihawk 9 coût) le plus longtemps possible — leur valeur augmente à chaque tour où elles restent en jeu.",
  "Séquencer Shanks avant Law & Bepo quand tu vises le bonus +2000 de Law & Bepo : Shanks repose déjà 1 perso adverse, il ne t'en faut plus qu'un seul pour activer le bonus.",
  "Reposer le Stage (Coffin Boat) ou un DON!! pour l'effet leader plutôt qu'un personnage, sauf si reposer ce personnage déclenche lui-même un effet utile (Shanks, Mihawk 9 coût).",
  "Une fois l'adversaire suffisamment verrouillé (personnages qui ne peuvent plus se réactiver/attaquer), le board devient secondaire — vise directement le leader adverse pour accélérer la fin de partie.",
  "Contre un leader Tranchant (Slash) adverse, Mihawk passe à 6000 de puissance : matchup à jouer plus agressivement que d'habitude.",
];

export interface MihawkMatchupNote {
  opponent: string;
  confidence: "Observation isolée" | "Hypothèse à tester";
  note: string;
}

export const MIHAWK_MATCHUP_NOTES: MihawkMatchupNote[] = [
  {
    opponent: "Leaders Tranchant (Slash) — ex. Zoro, Nefertari Vivi",
    confidence: "Hypothèse à tester",
    note: "Le bonus +1000 passif de Mihawk rend ce matchup structurellement favorable — à confirmer par tes propres résultats.",
  },
  {
    opponent: "Jinbe",
    confidence: "Observation isolée",
    note: "Signalé comme le seul matchup nettement défavorable par un joueur compétitif (tier list personnelle, un seul avis) — à vérifier toi-même, aucune donnée de tournoi agrégée derrière ce point précis.",
  },
];
