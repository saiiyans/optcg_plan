export interface DeckProfileScore {
  label: string;
  score: number; // /10
}

export const MIHAWK_DECK_NAME = "MIHAWK HYBRID — SMOKER / BOSS BUILD";
export const MIHAWK_DECK_STYLE = "TEMPO / CONTROL / DON MANIPULATION";

export const MIHAWK_PROFILE_SCORES: DeckProfileScore[] = [
  { label: "Control", score: 9 },
  { label: "Board Development", score: 9.5 },
  { label: "Late Game", score: 9.5 },
  { label: "Consistency", score: 8 },
  { label: "Defense", score: 7.5 },
  { label: "Hand Quality", score: 8.5 },
  { label: "Aggro Resistance", score: 7 },
  { label: "Skill Ceiling", score: 10 },
  { label: "Tournament Potential", score: 9 },
];

export const HOW_THIS_DECK_WINS =
  "Mihawk cherche à créer plus de ressources utiles que l'adversaire grâce au restand de DON!!, à développer plusieurs bodies, à contrôler les cartes adverses et à empêcher son prochain tour d'être optimal.";

export const WIN_FLOW = ["Develop", "Control", "Rest / Freeze", "Recover DON", "Build Value", "Finish"];

export interface DeckTrait {
  title: string;
  description: string;
}

export const STRENGTHS: DeckTrait[] = [
  { title: "DON EFFICIENCY", description: "Mihawk peut récupérer jusqu'à 3 DON!! et convertir des coûts de Rest DON!! en avantage." },
  { title: "BOARD CONTROL", description: "Oden, Perona, OP12-037, OP13-040 et Law & Bepo réduisent énormément les options adverses." },
  { title: "BOARD FLOOD", description: "ST32-003 Mihawk permet de développer deux Characters en dépensant peu de DON!!." },
  { title: "HAND QUALITY", description: "Otama, Perona, Kin'emon, Samurai et Oden améliorent la qualité de la main." },
  { title: "LATE GAME", description: "Les gros Mihawk et Law & Bepo donnent un excellent endgame." },
  { title: "FLEXIBILITY", description: "Le deck peut cibler aussi bien les Characters que les DON!! adverses." },
];

export const WEAKNESSES: DeckTrait[] = [
  { title: "SEQUENCING", description: "Une activation Mihawk trop tôt peut empêcher de jouer les Characters nécessaires ce tour-ci." },
  { title: "HEAVY HANDS", description: "Plusieurs cartes sans Counter peuvent créer des mains dangereuses." },
  { title: "BOARD DEPENDENCY", description: "Le Leader a besoin d'un Character coût 5+ pour activer son moteur." },
  { title: "FAST AGGRO", description: "Les decks très rapides peuvent mettre la pression avant que Mihawk ne stabilise." },
  { title: "COMPLEX DECISIONS", description: "Une mauvaise cible de Freeze ou de Rest coûte énormément de tempo." },
];

export const BUILD_ANALYSIS =
  "Ta version actuelle est plus orientée pression, Banish et gros bodies que certaines versions Tournament Freeze plus proches du contrôle pur.";

export interface DeckChange {
  change: string;
  reasons: string[];
}

export const COACH_RECOMMENDATIONS = {
  intro: "Ton deck actuel n'est pas mauvais — voici une optimisation possible à tester, basée sur des builds de tournoi, pas une obligation.",
  cuts: [
    { change: "-2 OP10-030 Smoker", reasons: ["diminue la densité de cartes sans Counter", "améliore la régularité des mains d'ouverture", "laisse de la place pour des pièces défensives"] },
    { change: "-1 OP14-119 Mihawk", reasons: ["réduit le risque de main lourde (9 coût, pas de Counter)"] },
    { change: "-1 OP14-033 Perona", reasons: ["4 copies peuvent être redondantes une fois le contrôle établi"] },
    { change: "-1 OP06-038", reasons: ["carte la moins prioritaire du lot actuel"] },
    { change: "-1 OP14-039 Coffin Boat", reasons: ["lent contre les decks agressifs"] },
  ] as DeckChange[],
  adds: [
    { change: "+2 ST32-005 Roronoa Zoro", reasons: ["plus de Counter +2000", "interaction dès l'early game", "synergie Slash", "meilleure consistance défensive"] },
    { change: "+1 OP13-031 Trafalgar Law", reasons: ["renforce le recyclage de Searchers déjà utilisés"] },
    { change: "+1 ST24-004 Trafalgar Law & Bepo", reasons: ["renforce le late game et la défense du Leader"] },
    { change: "+2 OP13-040", reasons: ["plus de Freeze et de Counter +3000"] },
  ] as DeckChange[],
};

export const HAWKEYE_RULES = [
  { n: 1, title: "CHARACTERS FIRST. MIHAWK SECOND.", description: "Toujours jouer les Characters nécessaires avant d'activer l'effet Leader." },
  { n: 2, title: "VALUE BEFORE DAMAGE.", description: "Privilégie l'avantage de ressources plutôt que les dégâts immédiats quand le choix se présente." },
  { n: 3, title: "BOARD > LIFE AGAINST FLOOD.", description: "Face à un deck qui développe beaucoup de Characters, priorise le contrôle du board plutôt que la vie du Leader." },
  { n: 4, title: "FREEZE THE FUTURE.", description: "Ne regarde pas uniquement la carte la plus puissante — gèle ce qui aura le plus de valeur au tour suivant." },
  { n: 5, title: "COUNT EFFECTIVE DON.", description: "Compte le DON!! actif ET le DON!! récupérable via Mihawk, Coffin Boat, Smoker et les autres effets de restand." },
  { n: 6, title: "AVOID BRICK OVERLOAD.", description: "Ne garde pas trop de cartes sans Counter en main simultanément." },
  { n: 7, title: "PLAN TWO TURNS AHEAD.", description: "Anticipe le tour adverse suivant avant de décider de ta séquence." },
];
