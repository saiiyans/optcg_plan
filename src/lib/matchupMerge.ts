import { MATCHUP_CENTER, MatchupEntry } from "./matchupCenter";
import { MATCHUP_GUIDES, MatchupTip } from "./matchupGuide";

/**
 * Fusionne les deux fiches matchups qui existaient jusqu'ici séparément
 * (Matchup Center = plans de jeu tactiques détaillés écrits à la main,
 * Matchups = fiches sourcées depuis des tier lists/stats publiques) en une
 * seule liste, pour la nouvelle page /matchups unique.
 *
 * Correspondance FAITE À LA MAIN (pas de matching flou par nom au runtime) :
 * une carte de tournoi qui va servir à un vrai tournoi ne doit jamais risquer
 * une mauvaise association opposant->conseils à cause d'un matching
 * approximatif. Les deux fiches ont parfois été écrites à des moments
 * différents avec des niveaux de confiance différents (l'une est une analyse
 * perso, l'autre vient de tier lists publiques) — quand les deux se
 * prononcent et se contredisent, les DEUX avis restent affichés côte à côte
 * avec leur source, jamais un seul retenu silencieusement à la place de
 * l'autre.
 */
const CENTER_TO_GUIDE_ALIAS: Record<string, string> = {
  "purple-enel": "Enel (OP15-058)",
  "green-blue-luffy": "Luffy Vert/Bleu (OP16-022)",
  "black-yellow-teach": "Marshall D. Teach (OP16-080)",
  "blue-yellow-nami": "Nami (OP11-041)",
  "purple-yellow-rosinante": "Rosinante (OP12-061)",
  "black-yamato": "Yamato (OP16-079)",
};

export interface MergedMatchup {
  slug: string;
  opponentLabel: string; // label affiché (badge résolu depuis le libellé texte)
  center: MatchupEntry | null;
  guide: MatchupTip | null;
  /** true si les deux fiches donnent un avis contradictoire sur la difficulté */
  conflicting: boolean;
}

function guideDifficultyLeansFavorable(d: MatchupTip["difficulty"]) {
  return d === "Favorable";
}
function centerDifficultyLeansFavorable(d: MatchupEntry["difficulty"]) {
  return d === "good" || d === "slightly-favorable";
}
function guideDifficultyLeansUnfavorable(d: MatchupTip["difficulty"]) {
  return d === "Défavorable";
}
function centerDifficultyLeansUnfavorable(d: MatchupEntry["difficulty"]) {
  return d === "hard" || d === "very-hard";
}

export function getMergedMatchups(): { merged: MergedMatchup[]; guideOnly: MatchupTip[] } {
  const guideList = MATCHUP_GUIDES.flatMap((g) => g.worstMatchups);
  const usedGuideOpponents = new Set<string>();

  const merged: MergedMatchup[] = MATCHUP_CENTER.map((c) => {
    const guideOpponent = CENTER_TO_GUIDE_ALIAS[c.slug];
    const guide = guideOpponent ? guideList.find((g) => g.opponent === guideOpponent) ?? null : null;
    if (guide) usedGuideOpponents.add(guide.opponent);
    const conflicting =
      !!guide &&
      ((centerDifficultyLeansFavorable(c.difficulty) && guideDifficultyLeansUnfavorable(guide.difficulty)) ||
        (centerDifficultyLeansUnfavorable(c.difficulty) && guideDifficultyLeansFavorable(guide.difficulty)));
    return { slug: c.slug, opponentLabel: c.opponent, center: c, guide, conflicting };
  });

  const guideOnly = guideList.filter((g) => !usedGuideOpponents.has(g.opponent));

  return { merged, guideOnly };
}
