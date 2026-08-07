export type Difficulty = "very-hard" | "hard" | "even" | "good" | "slightly-favorable";

export interface MatchupEntry {
  slug: string;
  opponent: string;
  difficulty: Difficulty;
  trainingPriority: number; // 1-5 étoiles
  primaryObjective: string;
  why: string;
  plan: string;
  keyCards: string[]; // cardNumbers
  dontDo: string[];
  winCondition: string;
  warning?: string;
}

export const DIFFICULTY_LABEL: Record<Difficulty, { label: string; icon: string; color: string }> = {
  "very-hard": { label: "VERY HARD", icon: "🔴🔴", color: "text-red-400" },
  hard: { label: "HARD", icon: "🔴", color: "text-red-400" },
  even: { label: "EVEN", icon: "🟡", color: "text-gold" },
  good: { label: "GOOD", icon: "🟢", color: "text-emerald-bright" },
  "slightly-favorable": { label: "SLIGHTLY FAVORABLE", icon: "🟢", color: "text-emerald-bright" },
};

export const MATCHUP_CENTER: MatchupEntry[] = [
  {
    slug: "purple-enel",
    opponent: "Purple Enel",
    difficulty: "hard",
    trainingPriority: 5,
    primaryObjective: "DÉVELOPPER PLUSIEURS MENACES",
    why: "Enel génère beaucoup de ressources et tient bien la longueur — il peut mettre la pression avant que Mihawk n'ait fini de stabiliser le board.",
    plan: "Développe plusieurs menaces plutôt que de tout miser sur un seul gros body. Utilise Freeze efficacement sur les pièces qui comptent vraiment, et garde une main de bonne qualité — pas de brick.",
    keyCards: ["ST32-002", "OP13-040", "OP13-031", "ST24-004"],
    dontDo: ["Compter uniquement sur tes gros Boss pour gagner", "Garder une main trop lourde en début de partie"],
    winCondition: "Stabiliser tôt, contrôler le rythme, puis prendre l'avantage en milieu/fin de partie grâce au Freeze et à la qualité de main.",
    warning: "Enel punit sévèrement les mains lentes — mulligan agressif si ta main ne peut rien faire avant le tour 3.",
  },
  {
    slug: "green-blue-luffy",
    opponent: "Green/Blue Luffy",
    difficulty: "very-hard",
    trainingPriority: 5,
    primaryObjective: "CONTROL BOARD",
    why: "Luffy peut inonder le board très vite et enchaîner des tours explosifs — si tu le laisses s'installer, la partie devient très difficile à rattraper.",
    plan: "Priorise le contrôle du board plutôt que les dégâts sur le Leader. Règle simple : BOARD > LIFE.",
    keyCards: ["ST32-002", "OP14-033", "OP12-037", "OP13-040", "ST24-004"],
    dontDo: ["Laisser Luffy construire un board large sans réagir", "Prioriser l'attaque directe sur le Leader plutôt que le contrôle"],
    winCondition: "Survivre au flood initial, contrôler, Freeze les menaces, puis établir plusieurs corps 6000-7000 pour reprendre la partie en main/fin de partie.",
    warning: "Ne laisse jamais Luffy établir un board large sans réponse.",
  },
  {
    slug: "black-yellow-teach",
    opponent: "Black/Yellow Teach",
    difficulty: "good",
    trainingPriority: 3,
    primaryObjective: "TEMPO → BOARD → LOCK",
    why: "Teach retire des personnages un par un — un board Mihawk trop étalé se fait démanteler pièce par pièce, mais le deck a les outils pour prendre l'avantage.",
    plan: "Développe plusieurs menaces et enchaîne pour l'empêcher d'avoir un tour parfaitement efficace. Gèle ses ressources importantes plutôt que ses petites pièces.",
    keyCards: ["ST32-003", "OP13-040"],
    dontDo: ["Étaler un board large de petites pièces facilement retirables"],
    winCondition: "Forcer Teach à répondre à plusieurs menaces simultanément plutôt qu'une seule cible facile à retirer.",
  },
  {
    slug: "blue-yellow-nami",
    opponent: "Blue/Yellow Nami",
    difficulty: "good",
    trainingPriority: 3,
    primaryObjective: "BUILD BOARD → PRESERVE HAND → MULTIPLE LARGE ATTACKS",
    why: "Nami joue sur la durée et la valeur — mais Mihawk peut construire un avantage de board plus vite qu'elle ne peut répondre.",
    plan: "Développe progressivement plusieurs gros corps sans gaspiller tes ressources trop tôt, puis enchaîne plusieurs attaques importantes le même tour.",
    keyCards: ["ST32-002", "ST32-003"],
    dontDo: ["Gaspiller ta main en petites actions dispersées au lieu de construire un vrai board"],
    winCondition: "Accumuler un avantage de board progressif jusqu'à pouvoir enchaîner plusieurs attaques décisives.",
  },
  {
    slug: "purple-yellow-rosinante",
    opponent: "Purple/Yellow Rosinante",
    difficulty: "even",
    trainingPriority: 4,
    primaryObjective: "IDENTIFIER SON ENGINE",
    why: "Matchup dépendant de l'ordre de jeu — celui qui prend l'initiative sur le moteur adverse en premier prend l'avantage.",
    plan: "Identifie rapidement quel engine Rosinante essaie de mettre en place, et ne gaspille pas tes Freeze sur des cibles secondaires sans importance.",
    keyCards: ["OP13-040"],
    dontDo: ["Freeze une cible de faible valeur alors que l'engine principal est encore actif"],
    winCondition: "Couper l'engine adverse au bon moment tout en développant ton propre board.",
  },
  {
    slug: "black-yamato",
    opponent: "Black Yamato",
    difficulty: "hard",
    trainingPriority: 5,
    primaryObjective: "CONSISTENCY EARLY",
    why: "Yamato peut mettre beaucoup de pression avant que le plan late-game de Mihawk ne soit opérationnel.",
    plan: "Priorise la régularité, le Counter +2000 et la stabilisation en milieu de partie plutôt que les gros bodies dès l'ouverture.",
    keyCards: ["ST32-002", "OP12-034", "ST32-003"],
    dontDo: ["Garder une main d'ouverture trop lourde (plusieurs gros Mihawk/Law & Bepo sans Counter)"],
    winCondition: "Stabiliser tôt avec du Counter fiable, puis reprendre l'avantage une fois le rythme adverse cassé.",
    warning: "Une main trop lourde contre ce matchup est presque toujours à mulliganer.",
  },
  {
    slug: "red-green-luffy",
    opponent: "Red/Green Luffy",
    difficulty: "hard",
    trainingPriority: 5,
    primaryObjective: "CONTROL BEFORE RACE",
    why: "Ce Luffy peut transformer la partie en course de dégâts — un terrain où Mihawk n'est pas favori.",
    plan: "Refuse la course. Transforme la partie en bataille de ressources en contrôlant le board plutôt qu'en échangeant les dégâts.",
    keyCards: ["ST32-002", "OP14-033", "OP12-037"],
    dontDo: ["Accepter une course de dégâts trop tôt dans la partie"],
    winCondition: "Ramener la partie sur le terrain du contrôle de ressources, où le deck est structurellement plus fort.",
  },
  {
    slug: "purple-katakuri",
    opponent: "Purple Katakuri",
    difficulty: "hard",
    trainingPriority: 5,
    primaryObjective: "À DÉTERMINER AVEC PLUS DE PARTIES",
    why: "Matchup exigeant historiquement pour beaucoup de decks Green — priorité d'entraînement élevée pour ne pas l'oublier.",
    plan: "Loguer chaque partie dans le Journal pour affiner ce plan avec de vraies données plutôt que des suppositions.",
    keyCards: [],
    dontDo: [],
    winCondition: "À affiner avec l'expérience de jeu.",
  },
  {
    slug: "blue-kuzan",
    opponent: "Blue Kuzan",
    difficulty: "slightly-favorable",
    trainingPriority: 3,
    primaryObjective: "FORCER PLUSIEURS RÉPONSES",
    why: "Le board flood de ST32 Mihawk permet de créer plusieurs menaces simultanées que Kuzan a du mal à gérer toutes en même temps.",
    plan: "Utilise ST32 Mihawk pour développer rapidement plusieurs corps et forcer l'adversaire à répondre à plus d'une menace à la fois.",
    keyCards: ["ST32-003"],
    dontDo: [],
    winCondition: "Multiplier les menaces jusqu'à ce que l'adversaire ne puisse plus toutes les gérer.",
  },
  {
    slug: "purple-kid",
    opponent: "Purple Kid",
    difficulty: "good",
    trainingPriority: 2,
    primaryObjective: "PROLONGED CONTROL",
    why: "Un contrôle prolongé empêche Kid de stabiliser facilement son propre plan de jeu.",
    plan: "Gèle les menaces importantes et maintiens ton avantage de board sur la durée plutôt que de chercher une fin de partie rapide.",
    keyCards: ["OP13-040", "OP14-033"],
    dontDo: [],
    winCondition: "Maintenir le contrôle jusqu'à ce que l'adversaire n'ait plus de réponse.",
  },
];
