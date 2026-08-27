// Constantes partagées entre /journal (page principale, section 5) et
// l'onglet Journal historique de /prep — pour ne jamais dupliquer la même
// liste à deux endroits (section 6 : "ne pas dupliquer la même info dans
// plusieurs champs").

export const KAIZOKU_HISTORY_URL =
  "https://www.cardkaizoku.com/matchhistory/search?deviceId=e29ac874724b98687ab5663ff84515eaa9bba570&playerId=fDimCsmSzViWrxSA3Sx9ECNzoZ1I&page=1";

export const OPENING_HAND_OPTIONS = [
  "Excellente", "Bonne", "Moyenne", "Mauvaise",
  "Trop de cartes sans Counter", "Aucun coût 5+", "ST32-003 sans cible",
  "Trop de boss", "Trop d'Events", "Aucune carte de setup",
];

// Erreurs génériques : voir MISTAKE_CATEGORIES dans defeatAnalysis.ts, ne
// pas dupliquer ici — seulement les cases spécifiques à mon deck (Mihawk
// OP14-020) sans équivalent générique.
export const DECK_SPECIFIC_MISTAKES = [
  "Setup coût 1 absent", "Mauvaise cible gelée",
  "ST32-003 mal utilisé", "Mauvaise cible jouée par ST32-003",
  "Smoker mal protégé", "Surdéveloppement du board",
  "Attaqué dans un Blocker",
  "Oublié que le DON!! attaché revient au tour suivant",
  "Law & Bepo mal préparé",
];
