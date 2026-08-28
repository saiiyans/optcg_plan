/**
 * Quiz d'entraînement "Garder ou Mulligan ?" — décide si une main de
 * départ de 5 cartes doit être gardée ou redonnée (mulligan à usage unique,
 * sans scry, avant la partie — règle standard du One Piece Card Game déjà
 * reflétée par MIHAWK_MULLIGAN/MIHAWK_TURN_GUIDE dans mihawkGamePlan.ts).
 *
 * IMPORTANT — nature de ce contenu : ce ne sont PAS des statistiques
 * officielles ni des mains réellement tirées en tournoi. Ce sont des
 * exemples pédagogiques construits à partir du plan de jeu déjà documenté
 * et sourcé ailleurs dans l'app (MIHAWK_CORE_CARDS, MIHAWK_MULLIGAN,
 * MIHAWK_TURN_GUIDE, MIHAWK_PRINCIPLES dans mihawkGamePlan.ts) — jamais une
 * carte ou un numéro inventé : seules les 8 cartes déjà documentées dans
 * MIHAWK_CORE_CARDS apparaissent nommément ; le reste du deck (non détaillé
 * carte par carte dans l'app) est représenté par des cases génériques
 * "carte non-clé" plutôt que par un numéro de carte deviné.
 *
 * Idée validée par la revue de onepiece.gg/playtest (simulateur solo complet
 * avec decisions d'ouverture de main) lors de la recherche du 28/08/2026 —
 * ce quiz est une version bien plus légère, ciblée uniquement sur la
 * décision mulligan pour Mihawk, pas un simulateur de partie complet.
 */

export type TurnOrder = "goingFirst" | "goingSecond";

export interface MulliganHandCard {
  cardNumber: string | null; // null = case générique "carte non-clé"
  label: string;
}

export interface MulliganScenario {
  id: string;
  turnOrder: TurnOrder;
  hand: MulliganHandCard[];
  correctAnswer: "garder" | "mulligan";
  explanation: string;
}

const PERONA = { cardNumber: "OP12-034", label: "Perona (1 coût) — chercheuse" };
const COFFIN_BOAT = { cardNumber: "OP14-039", label: "Coffin Boat (Stage) — tempo" };
const KIKUNOJO = { cardNumber: "OP14-023", label: "Kikunojo — Counter 2000" };
const HUMANDRILL = { cardNumber: "OP14-032", label: "Humandrill — Counter + contrôle" };
const TASHIGI = { cardNumber: "OP14-029", label: "Tashigi (5 coût) — attaquante" };
const SHANKS = { cardNumber: "OP14-027", label: "Shanks (7 coût) — contrôle" };
const MIHAWK9 = { cardNumber: "OP14-119", label: "Mihawk (9 coût) — finisseur" };
const LAW_BEPO = { cardNumber: "ST24-004", label: "Law & Bepo (10 coût) — finisseur" };

function filler(n: number): MulliganHandCard {
  return { cardNumber: null, label: `Carte non-clé #${n} (autre carte du deck, non détaillée ici)` };
}

export const MULLIGAN_SCENARIOS: MulliganScenario[] = [
  {
    id: "ideal-first",
    turnOrder: "goingFirst",
    hand: [COFFIN_BOAT, PERONA, TASHIGI, SHANKS, MIHAWK9],
    correctAnswer: "garder",
    explanation:
      "Main idéale en premier joueur : les deux plays de tour 1 (Coffin Boat + Perona) sont là, suivis d'une courbe complète jusqu'au finisseur 9 coût. Correspond exactement au conseil de MIHAWK_MULLIGAN (\"garder une main avec Coffin Boat + Perona 1 coût, et idéalement Tashigi, Shanks ou Law pour la suite\").",
  },
  {
    id: "good-second",
    turnOrder: "goingSecond",
    hand: [COFFIN_BOAT, PERONA, TASHIGI, KIKUNOJO, filler(1)],
    correctAnswer: "garder",
    explanation:
      "Même base recommandée en second joueur (Coffin Boat + Perona 1 coût), avec Tashigi comme suite naturelle et un Counter cherchable pour tenir le début de partie. Rien à redire, on garde.",
  },
  {
    id: "no-turn1-first",
    turnOrder: "goingFirst",
    hand: [TASHIGI, SHANKS, MIHAWK9, LAW_BEPO, KIKUNOJO],
    correctAnswer: "mulligan",
    explanation:
      "Grosse main sur le papier, mais AUCUNE carte jouable au tour 1 (ni Coffin Boat ni Perona 1 coût) : tu passes ton premier tour à ne rien faire et prends du retard sur l'activation de l'effet leader (qui a besoin d'un perso coût 5+ en jeu). Le plan de tour (MIHAWK_TURN_GUIDE) part toujours d'un play de tour 1 — sans lui, la courbe entière décale d'un tour.",
  },
  {
    id: "empty-second",
    turnOrder: "goingSecond",
    hand: [filler(1), filler(2), filler(3), filler(4), MIHAWK9],
    correctAnswer: "mulligan",
    explanation:
      "Un seul gros finisseur isolé, entouré de rien pour tenir le début de partie. Sans base pour activer l'effet leader tôt, ce Mihawk 9 coût risque d'arriver bien trop tard, voire jamais s'il est mort avant. Main à redonner.",
  },
  {
    id: "solid-first",
    turnOrder: "goingFirst",
    hand: [PERONA, KIKUNOJO, HUMANDRILL, TASHIGI, filler(1)],
    correctAnswer: "garder",
    explanation:
      "Perona assure le tour 1 et fouille en plus 5 cartes pour trouver la suite — quasiment toujours quelque chose vu la construction du deck. Deux Counters cherchables pour tenir le début, puis Tashigi comme premier gros play. Solide.",
  },
  {
    id: "coffinboat-only-second",
    turnOrder: "goingSecond",
    hand: [COFFIN_BOAT, TASHIGI, SHANKS, filler(1), filler(2)],
    correctAnswer: "garder",
    explanation:
      "Pas de Perona, mais Coffin Boat seul suffit pour jouer au tour 1 (le guide de tour dit \"Coffin Boat OU Perona 1 coût\", les deux sont interchangeables comme premier play). Tashigi puis Shanks derrière donnent une vraie suite. Pas la base \"idéale\" citée dans MIHAWK_MULLIGAN, mais fonctionnellement correcte.",
  },
  {
    id: "totally-empty",
    turnOrder: "goingFirst",
    hand: [filler(1), filler(2), filler(3), filler(4), filler(5)],
    correctAnswer: "mulligan",
    explanation:
      "Aucune des 8 pièces clés du deck (ni play de tour 1, ni attaquant protégé, ni finisseur) : une main sans identité, à redonner sans hésiter.",
  },
  {
    id: "perona-coffinboat-second",
    turnOrder: "goingSecond",
    hand: [PERONA, COFFIN_BOAT, HUMANDRILL, LAW_BEPO, filler(1)],
    correctAnswer: "garder",
    explanation:
      "Les deux plays de tour 1 sont réunis (rare d'avoir les deux, encore mieux), Humandrill pour contrôler un petit Blocker adverse, et un finisseur en réserve pour plus tard. Base saine, on garde.",
  },
];

export function shuffledScenarios(): MulliganScenario[] {
  const arr = [...MULLIGAN_SCENARIOS];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
