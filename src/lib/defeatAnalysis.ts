/**
 * Analyse du coach — Journal (défaites).
 *
 * Toute la logique ici est délibérément déterministe (pas d'appel à une
 * IA externe) : elle ne fait que croiser les informations que le joueur a
 * lui-même renseignées (cases cochées + champs structurés + texte libre)
 * avec un référentiel de vocabulaire compétitif OPTCG. Elle ne fabrique
 * jamais un fait non renseigné — voir `computeMissingInfoQuestions` et la
 * règle "Informations insuffisantes" plus bas.
 *
 * Fonctions pures (aucun accès `db` ici) pour rester testables isolément
 * (voir scripts de test lancés avec `tsx`) et pour que les routes API
 * restent de simples wrappers autour de `db.match.findMany` + ces
 * fonctions.
 */

// ---------------------------------------------------------------------
// 1. Taxonomie des erreurs (cahier des charges, section 4) — organisée en
//    7 catégories, reprises texto. Utilisée à la fois comme options de
//    cases à cocher dans le Journal et comme vocabulaire d'entrée de
//    l'analyse : chaque tag coché est ce qui permet à l'analyse de ne
//    jamais inventer une cause non soutenue par les données.
// ---------------------------------------------------------------------

export interface MistakeCategory {
  key: string;
  label: string;
  items: string[];
}

export const MISTAKE_CATEGORIES: MistakeCategory[] = [
  {
    key: "attaques",
    label: "Attaques et sequencing",
    items: [
      "Mauvais sequencing",
      "Jeu des cartes avant d'attaquer sans raison",
      "Mauvais ordre des attaques",
      "Mauvaise répartition des DON!!",
      "Attaques dans de mauvais magic numbers",
      "Attaque inutile contre la Life",
      "Mauvaise cible entre Leader et board",
      "Trop d'investissement dans une seule attaque",
      "Blocker non forcé avant le lethal",
      "Missed lethal",
      "Mauvaise lethal line",
      "Mauvaise préparation du lethal suivant",
      "Mauvaise gestion du crackback adverse",
    ],
  },
  {
    key: "defense",
    label: "Défense et counters",
    items: [
      "Overcounter",
      "Mauvais exact counter",
      "Vie défendue alors qu'il fallait la prendre",
      "Vie prise alors qu'il fallait la défendre",
      "Personnage trop protégé",
      "Personnage important abandonné trop facilement",
      "Mauvaise estimation du counter adverse",
      "Mauvais calcul de son propre counter disponible",
      "Mauvaise gestion des Blockers",
      "Trop de cartes utilisées pour défendre une menace peu importante",
    ],
  },
  {
    key: "board",
    label: "Board et tempo",
    items: [
      "Mauvaise gestion du board",
      "Board adverse laissé devenir trop large",
      "Removal utilisé sur une mauvaise cible",
      "Mauvais trade",
      "Manque de board presence",
      "Développement trop lent",
      "Mauvais choix entre développer et contrôler",
      "Perte de tempo",
      "Mauvais moment pour jouer une grosse carte",
      "Incapacité à stabiliser la partie",
      "Mauvaise gestion du card advantage",
      "Mauvaise gestion des ressources",
    ],
  },
  {
    key: "life_main",
    label: "Life et main",
    items: [
      "Trop de cartes données à l'adversaire en attaquant sa Life",
      "Mauvaise stratégie de life starvation",
      "Mauvaise gestion de sa propre Life",
      "Mauvaise lecture des Triggers possibles",
      "Mauvais hand tracking",
      "Mauvaise estimation de la taille de main adverse",
      "Main contenant trop de bricks ou de cartes sans counter",
      "Mauvais mulligan",
      "Ressources défensives utilisées trop tôt",
    ],
  },
  {
    key: "curve",
    label: "Curve et plan de jeu",
    items: [
      "Curve non respectée",
      "DON!! non utilisés efficacement",
      "Mauvaise first curve ou second curve",
      "Plan de jeu inadapté au matchup",
      "Mauvaise compréhension de sa win condition",
      "Mauvaise adaptation entre early, mid et late game",
      "Ligne trop greedy",
      "Ligne trop passive",
      "Absence de setup pour le tour suivant",
      "Mauvaise anticipation du power turn adverse",
      "Carte importante jouée au mauvais moment",
    ],
  },
  {
    key: "matchup",
    label: "Connaissance du matchup",
    items: [
      "Mauvaise connaissance du Leader adverse",
      "Carte clé adverse non respectée",
      "Absence de play around",
      "Mauvaise identification de la principale menace",
      "Mauvais choix de cible pour le removal",
      "Mauvaise compréhension du matchup",
      "Mauvais choix entre attaquer le Leader et contrôler le board",
      "Mauvaise estimation des Counter Events possibles",
    ],
  },
  {
    key: "externe",
    label: "Facteurs externes",
    items: [
      "Mauvaise pioche ou low roll",
      "Très bonne sortie adverse ou high roll",
      "Matchup défavorable",
      "Manque d'informations",
      "Erreur mécanique",
      "Oubli d'un effet",
      "Temps insuffisant",
      "Tilt ou manque de concentration",
    ],
  },
];

export const ALL_MISTAKE_TAGS: string[] = MISTAKE_CATEGORIES.flatMap((c) => c.items);

// ---------------------------------------------------------------------
// 2. Classification de la défaite (section 6) — 17 causes possibles.
// ---------------------------------------------------------------------

export const CLASSIFICATIONS = [
  "Sequencing",
  "Counter management",
  "DON!! allocation",
  "Curve",
  "Tempo",
  "Board control",
  "Life management",
  "Hand management",
  "Lethal calculation",
  "Mulligan",
  "Matchup knowledge",
  "Misplay mécanique",
  "Temps",
  "Tilt ou concentration",
  "Matchup défavorable",
  "Variance ou mauvaise pioche",
  "Informations insuffisantes",
] as const;
export type ClassificationKey = (typeof CLASSIFICATIONS)[number];

const TAG_TO_CLASSIFICATION: Record<string, ClassificationKey> = {
  "Mauvais sequencing": "Sequencing",
  "Jeu des cartes avant d'attaquer sans raison": "Sequencing",
  "Mauvais ordre des attaques": "Sequencing",
  "Mauvaise répartition des DON!!": "DON!! allocation",
  "Attaques dans de mauvais magic numbers": "Lethal calculation",
  "Attaque inutile contre la Life": "Life management",
  "Mauvaise cible entre Leader et board": "Board control",
  "Trop d'investissement dans une seule attaque": "Tempo",
  "Blocker non forcé avant le lethal": "Lethal calculation",
  "Missed lethal": "Lethal calculation",
  "Mauvaise lethal line": "Lethal calculation",
  "Mauvaise préparation du lethal suivant": "Lethal calculation",
  "Mauvaise gestion du crackback adverse": "Board control",

  "Overcounter": "Counter management",
  "Mauvais exact counter": "Counter management",
  "Vie défendue alors qu'il fallait la prendre": "Life management",
  "Vie prise alors qu'il fallait la défendre": "Life management",
  "Personnage trop protégé": "Counter management",
  "Personnage important abandonné trop facilement": "Board control",
  "Mauvaise estimation du counter adverse": "Counter management",
  "Mauvais calcul de son propre counter disponible": "Counter management",
  "Mauvaise gestion des Blockers": "Counter management",
  "Trop de cartes utilisées pour défendre une menace peu importante": "Counter management",

  "Mauvaise gestion du board": "Board control",
  "Board adverse laissé devenir trop large": "Board control",
  "Removal utilisé sur une mauvaise cible": "Board control",
  "Mauvais trade": "Board control",
  "Manque de board presence": "Board control",
  "Développement trop lent": "Tempo",
  "Mauvais choix entre développer et contrôler": "Tempo",
  "Perte de tempo": "Tempo",
  "Mauvais moment pour jouer une grosse carte": "Curve",
  "Incapacité à stabiliser la partie": "Board control",
  "Mauvaise gestion du card advantage": "Hand management",
  "Mauvaise gestion des ressources": "Hand management",

  "Trop de cartes données à l'adversaire en attaquant sa Life": "Life management",
  "Mauvaise stratégie de life starvation": "Life management",
  "Mauvaise gestion de sa propre Life": "Life management",
  "Mauvaise lecture des Triggers possibles": "Hand management",
  "Mauvais hand tracking": "Hand management",
  "Mauvaise estimation de la taille de main adverse": "Hand management",
  "Main contenant trop de bricks ou de cartes sans counter": "Mulligan",
  "Mauvais mulligan": "Mulligan",
  "Ressources défensives utilisées trop tôt": "Counter management",

  "Curve non respectée": "Curve",
  "DON!! non utilisés efficacement": "DON!! allocation",
  "Mauvaise first curve ou second curve": "Curve",
  "Plan de jeu inadapté au matchup": "Matchup knowledge",
  "Mauvaise compréhension de sa win condition": "Matchup knowledge",
  "Mauvaise adaptation entre early, mid et late game": "Tempo",
  "Ligne trop greedy": "Tempo",
  "Ligne trop passive": "Tempo",
  "Absence de setup pour le tour suivant": "Curve",
  "Mauvaise anticipation du power turn adverse": "Matchup knowledge",
  "Carte importante jouée au mauvais moment": "Curve",

  "Mauvaise connaissance du Leader adverse": "Matchup knowledge",
  "Carte clé adverse non respectée": "Matchup knowledge",
  "Absence de play around": "Matchup knowledge",
  "Mauvaise identification de la principale menace": "Matchup knowledge",
  "Mauvais choix de cible pour le removal": "Matchup knowledge",
  "Mauvaise compréhension du matchup": "Matchup knowledge",
  "Mauvais choix entre attaquer le Leader et contrôler le board": "Matchup knowledge",
  "Mauvaise estimation des Counter Events possibles": "Matchup knowledge",

  "Mauvaise pioche ou low roll": "Variance ou mauvaise pioche",
  "Très bonne sortie adverse ou high roll": "Matchup défavorable",
  "Matchup défavorable": "Matchup défavorable",
  "Manque d'informations": "Informations insuffisantes",
  "Erreur mécanique": "Misplay mécanique",
  "Oubli d'un effet": "Misplay mécanique",
  "Temps insuffisant": "Temps",
  "Tilt ou manque de concentration": "Tilt ou concentration",
};

const CLASSIFICATION_SHORT: Record<ClassificationKey, string> = {
  "Sequencing": "un mauvais ordre entre jouer tes cartes et attaquer",
  "Counter management": "une mauvaise gestion de tes Counters (trop, pas assez, ou mal calculés)",
  "DON!! allocation": "une répartition inefficace de tes DON!! entre attaque et développement",
  "Curve": "une courbe de développement mal respectée pour ce tour",
  "Tempo": "une perte de tempo sur une action trop lente ou peu rentable",
  "Board control": "un board adverse laissé devenir trop menaçant",
  "Life management": "une mauvaise gestion de la Life (la tienne ou celle de l'adversaire)",
  "Hand management": "un mauvais suivi de la main (la tienne ou celle de l'adversaire)",
  "Lethal calculation": "un calcul de lethal manqué ou mal préparé",
  "Mulligan": "un choix de mulligan ou une main de départ mal exploitée",
  "Matchup knowledge": "une connaissance insuffisante du matchup ou du Leader adverse",
  "Misplay mécanique": "une erreur mécanique ou un effet oublié pendant la partie",
  "Temps": "un manque de temps pour bien jouer tes derniers tours",
  "Tilt ou concentration": "une perte de concentration en cours de partie",
  "Matchup défavorable": "un matchup structurellement défavorable pour ton deck",
  "Variance ou mauvaise pioche": "une pioche défavorable (low roll)",
  "Informations insuffisantes": "pas assez d'informations enregistrées pour trancher",
};

// ---------------------------------------------------------------------
// 3. Terme technique (section 5) — vocabulaire compétitif, avec
//    définition FR affichée la première fois qu'il apparaît.
// ---------------------------------------------------------------------

export const TECHNICAL_TERMS = {
  sequencing: {
    label: "sequencing",
    definitionFr:
      "L'ordre dans lequel tu joues tes cartes et déclares tes attaques — un mauvais ordre peut donner à l'adversaire des informations ou des options de Counter qu'un meilleur ordre aurait évitées.",
  },
  overcounter: {
    label: "overcounter",
    definitionFr:
      "Utiliser plus de Counter que nécessaire pour survivre à une attaque, gaspillant une valeur qui aurait pu servir plus tard.",
  },
  counter_math: {
    label: "counter math",
    definitionFr:
      "Le calcul, avant de déclarer ou de subir une attaque, de la puissance exacte nécessaire pour survivre ou pour percer la défense adverse.",
  },
  don_allocation: {
    label: "DON!! allocation",
    definitionFr:
      "La répartition de tes DON!! entre attaque et développement — mal répartis, ils font manquer un lethal ou gâchent un tour de développement.",
  },
  tempo_loss: {
    label: "tempo loss",
    definitionFr:
      "Le fait de prendre du retard sur le rythme de la partie en jouant une action lente ou peu rentable, laissant l'adversaire prendre l'initiative.",
  },
  missed_lethal: {
    label: "missed lethal",
    definitionFr:
      "Une situation où le lethal (assez de puissance pour terminer les vies adverses) était disponible mais n'a pas été vu ni joué.",
  },
  board_control: {
    label: "board control",
    definitionFr:
      "La gestion du rapport de force entre ton board et celui de l'adversaire — le laisser devenir trop large retire des options par la suite.",
  },
  card_advantage: {
    label: "card advantage",
    definitionFr:
      "Le nombre de ressources (cartes, DON!!, personnages) que tu as en jeu ou en main par rapport à l'adversaire — en perdre sans contrepartie affaiblit chaque tour suivant.",
  },
  life_starvation: {
    label: "life starvation",
    definitionFr:
      "Limiter volontairement les attaques contre le Leader adverse pour éviter de lui donner des cartes supplémentaires en piochant ses vies.",
  },
  curve: {
    label: "curve",
    definitionFr: "Le rythme auquel tu développes ton board selon le coût de tes cartes et le nombre de DON!! disponibles chaque tour.",
  },
  crackback: {
    label: "crackback",
    definitionFr:
      "La contre-attaque immédiate de l'adversaire au tour suivant, rendue possible par le board ou les ressources laissées après ton propre tour.",
  },
  hand_tracking: {
    label: "hand tracking",
    definitionFr:
      "Le suivi du nombre et du type de cartes que l'adversaire garde en main, pour anticiper ses options de Counter ou de Trigger.",
  },
  play_around: {
    label: "play around",
    definitionFr: "Jouer en anticipant la pire carte que l'adversaire pourrait avoir, plutôt qu'en espérant qu'il ne l'ait pas.",
  },
  resource_management: {
    label: "resource management",
    definitionFr: "La gestion globale de tes ressources (cartes, DON!!, Vies) sur toute la partie plutôt que tour par tour.",
  },
  matchup_knowledge: {
    label: "matchup knowledge",
    definitionFr: "La connaissance du deck, du Leader et des cartes clés de l'adversaire, qui permet d'anticiper ses lignes de jeu probables.",
  },
} as const;
export type TechnicalTermKey = keyof typeof TECHNICAL_TERMS;

const CLASSIFICATION_DEFAULT_TERM: Partial<Record<ClassificationKey, TechnicalTermKey>> = {
  "Sequencing": "sequencing",
  "Counter management": "counter_math",
  "DON!! allocation": "don_allocation",
  "Curve": "curve",
  "Tempo": "tempo_loss",
  "Board control": "board_control",
  "Life management": "life_starvation",
  "Hand management": "hand_tracking",
  "Lethal calculation": "missed_lethal",
  "Matchup knowledge": "matchup_knowledge",
};

const TAG_TERM_OVERRIDE: Record<string, TechnicalTermKey> = {
  "Overcounter": "overcounter",
  "Mauvaise gestion du crackback adverse": "crackback",
  "Absence de play around": "play_around",
  "Carte clé adverse non respectée": "play_around",
  "Mauvaise gestion du card advantage": "card_advantage",
  "Mauvaise gestion des ressources": "resource_management",
};

// ---------------------------------------------------------------------
// 4. Les six fondamentaux (section 3) — checklist, jamais transformée
//    automatiquement en erreur : seulement retenue si un tag correspondant
//    a été coché par le joueur.
// ---------------------------------------------------------------------

export interface Fundamental {
  id: string;
  question: string;
  tags: string[];
}

export const FUNDAMENTALS: Fundamental[] = [
  {
    id: "attack_before_hand",
    question: "Ai-je attaqué avant de jouer les cartes de ma main lorsque c'était préférable ?",
    tags: ["Jeu des cartes avant d'attaquer sans raison"],
  },
  {
    id: "overcounter",
    question: "Ai-je utilisé trop de counter ou fait un overcounter ?",
    tags: ["Overcounter", "Mauvais exact counter"],
  },
  {
    id: "attack_sequencing",
    question: "Ai-je correctement séquencé mes attaques, de la plus petite à la plus menaçante lorsque cette ligne était optimale ?",
    tags: ["Mauvais ordre des attaques", "Mauvais sequencing", "Mauvaise lethal line"],
  },
  {
    id: "curve_don",
    question: "Ai-je respecté ma curve en utilisant efficacement mes DON!! ?",
    tags: ["Curve non respectée", "DON!! non utilisés efficacement", "Mauvaise répartition des DON!!"],
  },
  {
    id: "tempo",
    question: "Ai-je perdu du tempo en jouant une action trop lente ou peu rentable ?",
    tags: ["Perte de tempo", "Développement trop lent", "Ligne trop passive"],
  },
  {
    id: "power_analysis",
    question: "Ai-je correctement analysé la puissance d'attaque et la puissance défensive des deux joueurs ?",
    tags: ["Mauvaise estimation du counter adverse", "Mauvais calcul de son propre counter disponible", "Mauvaise gestion du crackback adverse"],
  },
];

// ---------------------------------------------------------------------
// 5. Textes de coaching par classification (cause, meilleure ligne,
//    leçon, exercice) — voir section 5 et l'exemple de la section 9.
// ---------------------------------------------------------------------

interface Ctx {
  opponentLeader: string;
}

const CLASSIFICATION_COPY: Record<ClassificationKey, { cause: (ctx: Ctx) => string; bestLine: (ctx: Ctx) => string; lesson: string; exercise: string }> = {
  "Sequencing": {
    cause: (c) => `La défaite semble liée à l'ordre de tes actions : jouer tes cartes et déclarer tes attaques dans le mauvais ordre a probablement donné à ${c.opponentLeader} plus d'informations ou d'options de Counter qu'un meilleur séquencement ne l'aurait permis.`,
    bestLine: () => "Probablement : jouer d'abord tes personnages, activer ensuite les effets qui te ferment des options, puis attaquer en dernier dans l'ordre qui force les pires Counters adverses.",
    lesson: "Joue toujours tes cartes avant d'attaquer, sauf raison précise de faire l'inverse.",
    exercise: "Pendant les trois prochaines parties, annonce toutes tes attaques avant de jouer une carte.",
  },
  "Counter management": {
    cause: (c) => `La défaite semble venir d'une mauvaise gestion de tes Counters — trop utilisés sur une menace mineure, ou mal calculés face à ${c.opponentLeader}, ce qui t'a laissé sans ressource au moment où tu en avais vraiment besoin.`,
    bestLine: () => "Probablement : calculer la puissance exacte nécessaire avant de défendre, garder le Counter minimum suffisant sur les menaces mineures, et réserver le reste pour la menace réellement dangereuse.",
    lesson: "Ne counter jamais plus que la puissance exacte nécessaire pour survivre.",
    exercise: "Avant chaque défense, calcule la valeur exacte nécessaire pour counter.",
  },
  "DON!! allocation": {
    cause: () => "La défaite semble liée à une répartition de tes DON!! qui ne correspondait pas à ce que la partie demandait — probablement trop concentrés sur l'attaque ou sur le développement, sans équilibre entre les deux.",
    bestLine: () => "Probablement : répartir tes DON!! en gardant toujours un minimum pour sécuriser ton attaque du tour, plutôt que de tout investir dans un seul camp (attaque ou développement).",
    lesson: "Garde toujours de quoi finir ton tour avant de tout investir ailleurs.",
    exercise: "À chaque tour, note combien de DON!! te reste avant de décider d'attaquer ou de développer.",
  },
  "Curve": {
    cause: (c) => `La défaite semble venir d'un développement de board qui n'a pas suivi ta courbe de coût prévue, laissant ${c.opponentLeader} prendre l'avantage sur un tour où tu aurais dû être en avance.`,
    bestLine: (c) => `Probablement : prioriser une carte à coût raisonnable chaque tour plutôt que d'attendre une main parfaite, pour ne pas prendre de retard sur ${c.opponentLeader}.`,
    lesson: "Une carte jouée à coût raisonnable chaque tour vaut mieux qu'une main parfaite qui attend.",
    exercise: "Pendant les trois prochaines parties, joue une carte à coût raisonnable dès que possible, même imparfaite.",
  },
  "Tempo": {
    cause: (c) => `La défaite semble liée à une perte de tempo — une action trop lente ou peu rentable a laissé l'initiative à ${c.opponentLeader} au moment où la partie se jouait.`,
    bestLine: () => "Probablement : privilégier une action qui avance ton plan de jeu immédiatement, plutôt qu'une action plus sûre mais qui ne fait rien avancer ce tour-ci.",
    lesson: "Une action qui avance ton plan de jeu vaut mieux qu'une action juste \"sûre\".",
    exercise: "Avant chaque action, demande-toi : est-ce que ça avance mon plan de jeu ce tour-ci ?",
  },
  "Board control": {
    cause: () => "La défaite semble venir d'un board adverse laissé devenir trop large ou trop menaçant avant que tu n'aies pu le contrôler, ce qui a fini par déborder ta défense.",
    bestLine: () => "Probablement : retirer ou neutraliser la menace la plus dangereuse du board adverse avant qu'elle ne devienne incontrôlable, quitte à retarder ta propre offensive d'un tour.",
    lesson: "Ne laisse jamais un board adverse grossir sans réagir au moins une fois.",
    exercise: "À chaque tour adverse, identifie la carte la plus menaçante de son board avant le tien.",
  },
  "Life management": {
    cause: (c) => `La défaite semble venir d'une gestion de la Life mal ajustée — que ce soit la tienne (trop exposée) ou celle de ${c.opponentLeader} (attaquée au mauvais moment), la pression n'était pas au bon endroit.`,
    bestLine: (c) => `Probablement : contrôler d'abord le board avant d'attaquer agressivement la Life, pour ne pas donner de cartes supplémentaires à ${c.opponentLeader} avant d'avoir l'avantage.`,
    lesson: "Ne donne pas de cartes à l'adversaire si tu ne peux pas supporter son crackback.",
    exercise: "Avant chaque attaque de Life, demande-toi : est-ce que cette Life prise l'aide plus qu'elle ne m'aide ?",
  },
  "Hand management": {
    cause: (c) => `La défaite semble liée à un mauvais suivi de la main — la tienne (des ressources mal gérées) ou celle de ${c.opponentLeader} (mal évaluée), ce qui a faussé une décision clé.`,
    bestLine: (c) => `Probablement : suivre plus précisément le nombre de cartes gardées par ${c.opponentLeader} à chaque tour, pour mieux anticiper ses options de Counter avant d'attaquer.`,
    lesson: "Compte la main adverse à chaque tour, pas seulement quand tu comptes attaquer.",
    exercise: "Note la taille de la main adverse au début de chaque tour.",
  },
  "Lethal calculation": {
    cause: () => "La défaite semble venir d'un calcul de lethal manqué ou mal préparé — soit une fenêtre de victoire non vue, soit une ligne d'attaque qui n'a pas maximisé tes chances de terminer la partie.",
    bestLine: () => "Probablement : additionner la puissance de tous tes attaquants disponibles et la comparer aux vies adverses restantes avant de déclarer la première attaque, pas après.",
    lesson: "Calcule le lethal avant chaque attaque, jamais après l'avoir déclarée.",
    exercise: "À chaque tour, vérifie si tu as lethal avant de développer ton board.",
  },
  "Mulligan": {
    cause: (c) => `La défaite semble liée à ta main de départ — un choix de mulligan qui n'a pas donné un plan de jeu exploitable contre ${c.opponentLeader}.`,
    bestLine: () => "Probablement : mulliganer une main sans plan de jeu clair sur les 2-3 premiers tours, même si elle contient de bonnes cartes individuellement.",
    lesson: "Une main sans plan clair sur 3 tours se mulligan, même si elle est jolie.",
    exercise: "Avant de garder ta main, vérifie qu'elle a un plan clair sur les 3 premiers tours.",
  },
  "Matchup knowledge": {
    cause: (c) => `La défaite semble venir d'une connaissance insuffisante du Leader ou du deck de ${c.opponentLeader} — une carte clé ou une ligne de jeu adverse n'a probablement pas été anticipée.`,
    bestLine: (c) => `Probablement : anticiper la carte ou l'effet clé du deck de ${c.opponentLeader} avant qu'il ne soit joué, et ajuster ta ligne en conséquence plutôt que d'y réagir après coup.`,
    lesson: "Connaître la carte clé de l'adversaire vaut plus qu'une ligne de jeu générique.",
    exercise: "Avant chaque partie, relis la carte ou l'effet clé du deck adverse que tu affrontes.",
  },
  "Misplay mécanique": {
    cause: () => "La défaite semble liée à une erreur mécanique ou un effet oublié pendant la partie plutôt qu'à un choix stratégique — ce genre d'erreur se corrige avec de la vigilance, pas avec un nouveau plan de jeu.",
    bestLine: () => "Probablement : relire l'effet exact de tes cartes clés avant de les jouer, surtout sous pression, pour éviter d'oublier une étape ou un effet.",
    lesson: "Relis l'effet exact d'une carte avant de la jouer, surtout sous pression.",
    exercise: "Relis à voix haute l'effet de chaque carte importante avant de la jouer.",
  },
  "Temps": {
    cause: () => "La défaite semble liée au temps de la partie — une décision prise dans la précipitation par manque de temps, plutôt qu'à un choix stratégique erroné.",
    bestLine: () => "Probablement : préparer tes tours à l'avance pendant celui de l'adversaire, pour éviter de manquer de temps sur tes décisions les plus importantes.",
    lesson: "Prépare ta décision pendant le tour adverse, pas pendant le tien.",
    exercise: "Prépare mentalement ton tour pendant celui de l'adversaire.",
  },
  "Tilt ou concentration": {
    cause: () => "La défaite semble liée à une perte de concentration en cours de partie plutôt qu'à un manque de connaissance ou de plan — ce facteur mérite d'être surveillé plus que corrigé techniquement.",
    bestLine: () => "Probablement : faire une courte pause avant les tours décisifs pour revenir à un calcul froid plutôt qu'à une décision réflexe.",
    lesson: "Une pause de cinq secondes avant un tour décisif change souvent la ligne choisie.",
    exercise: "Avant un tour décisif, prends 5 secondes de pause avant de jouer ta première carte.",
  },
  "Matchup défavorable": {
    cause: (c) => `La défaite semble en grande partie due à un matchup structurellement difficile contre ${c.opponentLeader}, plus qu'à une erreur de jeu identifiable dans les informations enregistrées.`,
    bestLine: () => "Non déterminée avec certitude — ce matchup mérite d'être testé sur plusieurs parties pour identifier une ligne de jeu qui fonctionne mieux.",
    lesson: "Un matchup difficile se travaille sur plusieurs parties, pas en une seule conclusion.",
    exercise: "Note ton plan de jeu contre ce matchup avant la partie, puis compare-le à ce que tu as réellement fait.",
  },
  "Variance ou mauvaise pioche": {
    cause: () => "La défaite semble en grande partie due à la pioche (low roll) plutôt qu'à une erreur de jeu identifiable — à surveiller sur plusieurs parties avant de tirer une vraie conclusion.",
    bestLine: () => "Non déterminée avec certitude — rejoue ce matchup pour voir si le problème se répète indépendamment de la pioche.",
    lesson: "Une pioche isolée ne dit rien — regarde la tendance sur plusieurs parties.",
    exercise: "Note si le même problème revient sur les 3 prochaines parties contre ce même adversaire.",
  },
  "Informations insuffisantes": {
    cause: () => "Il n'y a pas assez d'informations enregistrées pour cette partie pour identifier une cause fiable. Le texte de \"Ma raison initiale\" est conservé, mais l'analyse a besoin d'au moins une case cochée dans les catégories d'erreurs (ou d'un moment clé / état du board) pour se prononcer sans deviner.",
    bestLine: () => "Impossible à déterminer avec les informations actuelles — coche au moins une catégorie d'erreur pertinente, ou ajoute le moment clé / l'état du board, puis régénère l'analyse.",
    lesson: "Note au moins une info clé après chaque défaite pour que l'analyse serve à quelque chose la prochaine fois.",
    exercise: "Après ta prochaine défaite, coche au moins une catégorie d'erreur ou remplis le moment clé et l'état du board avant de fermer le formulaire.",
  },
};

// ---------------------------------------------------------------------
// 6. Questions "informations manquantes" — proposées seulement si le
//    champ correspondant est vide, jamais inventées.
// ---------------------------------------------------------------------

const MISSING_INFO_POOL: Partial<Record<ClassificationKey, { field: keyof DefeatAnalysisInput; question: string }[]>> = {
  "Board control": [{ field: "boardStateAtCritical", question: "Quel était l'état du board adverse au moment critique ?" }],
  "Lethal calculation": [
    { field: "myLifeRemaining", question: "Combien de vies te restait-il quand tu as cherché le lethal ?" },
    { field: "opponentLifeRemaining", question: "Combien de vies adverses restait-il à ce moment-là ?" },
  ],
  "Counter management": [{ field: "cardsInHandEnd", question: "Combien de cartes gardais-tu en main pour te défendre à ce moment-là ?" }],
  "Life management": [{ field: "opponentLifeRemaining", question: "Combien de vies adverses restait-il quand la partie a basculé ?" }],
  "DON!! allocation": [{ field: "donRecoveredUnused", question: "Combien de DON!! te restait-il inutilisés en fin de tour ?" }],
  "Matchup knowledge": [{ field: "decisiveMoment", question: "Quelle carte ou quel effet adverse t'a le plus surpris pendant cette partie ?" }],
  "Tempo": [{ field: "keyTurn", question: "À quel tour environ as-tu senti que tu perdais l'initiative ?" }],
  "Hand management": [{ field: "cardsInHandEnd", question: "Combien de cartes en main gardait probablement l'adversaire à ce moment-là ?" }],
};

const GENERIC_MISSING_QUESTIONS = [
  "Combien de cartes l'adversaire avait-il en main au moment décisif ?",
  "Quel était son board au début de ton dernier tour ?",
  "Combien de DON!! avais-tu gardés actifs ?",
];

// ---------------------------------------------------------------------
// 7. Moteur principal
// ---------------------------------------------------------------------

export interface DefeatAnalysisInput {
  opponentLeader: string;
  myDeck: string;
  turnOrder: string | null;
  mulligan: boolean | null;
  openingHandQuality: string | null;
  keyTurn: string | null;
  decisiveMoment: string | null;
  boardStateAtCritical: string | null;
  myLifeRemaining: number | null;
  opponentLifeRemaining: number | null;
  cardsInHandEnd: number | null;
  donRecoveredUnused: number | null;
  gameDurationMinutes: number | null;
  lossReason: string | null;
  whatCouldHaveDoneDifferently: string | null;
  tags: string[];
}

export interface DefeatAnalysisResult {
  classification: ClassificationKey;
  classificationSecondary: ClassificationKey[];
  mainCause: string;
  secondaryCauses: string[];
  criticalMoment: string;
  technicalTerm: TechnicalTermKey | null;
  bestLine: string;
  bestLineIsHypothesis: boolean;
  lessonFr: string;
  exerciseNext: string;
  confidenceLevel: "Élevé" | "Moyen" | "Faible";
  missingInfoQuestions: string[];
  fundamentalsFlagged: Fundamental[];
}

/** Ordonne les classifications présentes par nombre de tags décroissant. */
function rankClassifications(tags: string[]): { classification: ClassificationKey; count: number }[] {
  const counts = new Map<ClassificationKey, number>();
  for (const tag of tags) {
    const cls = TAG_TO_CLASSIFICATION[tag];
    if (!cls) continue;
    counts.set(cls, (counts.get(cls) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([classification, count]) => ({ classification, count }))
    .sort((a, b) => b.count - a.count);
}

export function analyzeDefeat(input: DefeatAnalysisInput): DefeatAnalysisResult {
  const ctx: Ctx = { opponentLeader: input.opponentLeader || "cet adversaire" };
  const validTags = input.tags.filter((t) => TAG_TO_CLASSIFICATION[t]);
  const ranked = rankClassifications(validTags);

  const structuredFieldCount = [
    input.keyTurn,
    input.decisiveMoment,
    input.boardStateAtCritical,
    input.myLifeRemaining != null,
    input.opponentLifeRemaining != null,
    input.cardsInHandEnd != null,
  ].filter(Boolean).length;

  const top = ranked[0];
  const classification: ClassificationKey = top ? top.classification : "Informations insuffisantes";
  const topCount = top ? top.count : 0;

  // Jusqu'à 2 causes secondaires, seulement si réellement soutenues.
  const classificationSecondary = ranked.slice(1, 3).map((r) => r.classification);

  const copy = CLASSIFICATION_COPY[classification];

  // Terme technique : override spécifique au tag le plus fréquent de la
  // classification retenue, sinon terme par défaut de la classification,
  // sinon aucun (facteurs externes / mécanique / etc. n'ont pas de terme
  // compétitif dédié — mieux vaut ne rien afficher que d'en inventer un).
  let technicalTerm: TechnicalTermKey | null = CLASSIFICATION_DEFAULT_TERM[classification] ?? null;
  for (const tag of validTags) {
    if (TAG_TO_CLASSIFICATION[tag] === classification && TAG_TERM_OVERRIDE[tag]) {
      technicalTerm = TAG_TERM_OVERRIDE[tag];
      break;
    }
  }

  // Moment critique : jamais fabriqué — verbatim des champs saisis.
  const momentParts = [input.keyTurn, input.decisiveMoment].filter(Boolean);
  const criticalMoment = momentParts.length > 0
    ? momentParts.join(" — ")
    : "Non renseigné — impossible à identifier avec les informations actuelles.";

  // Confiance : voir section 5. Jamais "Élevé" sans au moins un tag
  // explicitement coché dans la classification retenue.
  let confidenceLevel: "Élevé" | "Moyen" | "Faible";
  if (topCount === 0) confidenceLevel = "Faible";
  else if (topCount >= 2 || (topCount >= 1 && structuredFieldCount >= 2)) confidenceLevel = "Élevé";
  else confidenceLevel = "Moyen";

  const bestLineIsHypothesis = !(confidenceLevel === "Élevé" && structuredFieldCount >= 2);

  // Questions manquantes : seulement celles dont le champ est vide, max 3.
  const candidates = MISSING_INFO_POOL[classification] ?? [];
  const missingInfoQuestions: string[] = [];
  for (const c of candidates) {
    const value = input[c.field];
    const isEmpty = value == null || value === "";
    if (isEmpty) missingInfoQuestions.push(c.question);
    if (missingInfoQuestions.length >= 3) break;
  }
  if (missingInfoQuestions.length === 0 && confidenceLevel !== "Élevé") {
    for (const q of GENERIC_MISSING_QUESTIONS) {
      missingInfoQuestions.push(q);
      if (missingInfoQuestions.length >= (classification === "Informations insuffisantes" ? 3 : 1)) break;
    }
  }

  const fundamentalsFlagged = FUNDAMENTALS.filter((f) => f.tags.some((t) => validTags.includes(t)));

  return {
    classification,
    classificationSecondary,
    mainCause: copy.cause(ctx),
    secondaryCauses: classificationSecondary.map((c) => `Également présent : ${CLASSIFICATION_SHORT[c]}.`),
    criticalMoment,
    technicalTerm,
    bestLine: copy.bestLine(ctx),
    bestLineIsHypothesis,
    lessonFr: copy.lesson,
    exerciseNext: copy.exercise,
    confidenceLevel,
    missingInfoQuestions,
    fundamentalsFlagged,
  };
}

// ---------------------------------------------------------------------
// 8. Priorité d'entraînement (section 8) — une des 10 priorités,
//    sélectionnée selon les erreurs répétées récemment.
// ---------------------------------------------------------------------

export const TRAINING_PRIORITIES = [
  "Attaquer avant de jouer sa main",
  "Éviter l'overcounter",
  "Améliorer le sequencing",
  "Maîtriser sa curve",
  "Comprendre le tempo",
  "Améliorer le counter math",
  "Contrôler le board",
  "Calculer le lethal",
  "Suivre la main adverse",
  "Améliorer la connaissance du matchup",
  // Section 10 — deux priorités ajoutées à la demande (en plus des 10 déjà
  // existantes) : la liste complète compte donc 12 missions possibles.
  "Gérer le crackback",
  "Choisir correctement entre attaquer la Life et le board",
] as const;
export type TrainingPriorityKey = (typeof TRAINING_PRIORITIES)[number];

const TAG_TO_PRIORITY: Partial<Record<string, TrainingPriorityKey>> = {
  "Jeu des cartes avant d'attaquer sans raison": "Attaquer avant de jouer sa main",

  "Overcounter": "Éviter l'overcounter",

  "Mauvais sequencing": "Améliorer le sequencing",
  "Mauvais ordre des attaques": "Améliorer le sequencing",
  "Mauvaise lethal line": "Améliorer le sequencing",
  "Mauvaise préparation du lethal suivant": "Améliorer le sequencing",

  "Curve non respectée": "Maîtriser sa curve",
  "Mauvaise first curve ou second curve": "Maîtriser sa curve",
  "Absence de setup pour le tour suivant": "Maîtriser sa curve",
  "Carte importante jouée au mauvais moment": "Maîtriser sa curve",

  "Perte de tempo": "Comprendre le tempo",
  "Développement trop lent": "Comprendre le tempo",
  "Mauvais choix entre développer et contrôler": "Comprendre le tempo",
  "Trop d'investissement dans une seule attaque": "Comprendre le tempo",
  "Ligne trop greedy": "Comprendre le tempo",
  "Ligne trop passive": "Comprendre le tempo",
  "Mauvaise adaptation entre early, mid et late game": "Comprendre le tempo",

  "Mauvais exact counter": "Améliorer le counter math",
  "Mauvaise estimation du counter adverse": "Améliorer le counter math",
  "Mauvais calcul de son propre counter disponible": "Améliorer le counter math",
  "Mauvaise gestion des Blockers": "Améliorer le counter math",
  "Trop de cartes utilisées pour défendre une menace peu importante": "Améliorer le counter math",
  "Ressources défensives utilisées trop tôt": "Améliorer le counter math",

  "Mauvaise gestion du board": "Contrôler le board",
  "Board adverse laissé devenir trop large": "Contrôler le board",
  "Removal utilisé sur une mauvaise cible": "Contrôler le board",
  "Mauvais trade": "Contrôler le board",
  "Manque de board presence": "Contrôler le board",
  "Incapacité à stabiliser la partie": "Contrôler le board",
  "Mauvaise cible entre Leader et board": "Contrôler le board",
  "Personnage important abandonné trop facilement": "Contrôler le board",
  // Section 10 — priorité dédiée, plus précise que "Contrôler le board".
  "Mauvaise gestion du crackback adverse": "Gérer le crackback",

  "Attaques dans de mauvais magic numbers": "Calculer le lethal",
  "Blocker non forcé avant le lethal": "Calculer le lethal",
  "Missed lethal": "Calculer le lethal",
  "Attaque inutile contre la Life": "Calculer le lethal",

  "Mauvaise lecture des Triggers possibles": "Suivre la main adverse",
  "Mauvais hand tracking": "Suivre la main adverse",
  "Mauvaise estimation de la taille de main adverse": "Suivre la main adverse",
  "Mauvaise gestion du card advantage": "Suivre la main adverse",
  "Mauvaise gestion des ressources": "Suivre la main adverse",

  "Mauvaise connaissance du Leader adverse": "Améliorer la connaissance du matchup",
  "Carte clé adverse non respectée": "Améliorer la connaissance du matchup",
  "Absence de play around": "Améliorer la connaissance du matchup",
  "Mauvaise identification de la principale menace": "Améliorer la connaissance du matchup",
  "Mauvais choix de cible pour le removal": "Améliorer la connaissance du matchup",
  "Mauvaise compréhension du matchup": "Améliorer la connaissance du matchup",
  "Mauvaise estimation des Counter Events possibles": "Améliorer la connaissance du matchup",
  "Plan de jeu inadapté au matchup": "Améliorer la connaissance du matchup",
  "Mauvaise anticipation du power turn adverse": "Améliorer la connaissance du matchup",

  // Section 10 — priorité dédiée au choix Life vs board.
  "Mauvais choix entre attaquer le Leader et contrôler le board": "Choisir correctement entre attaquer la Life et le board",
};

export const PRIORITY_MISSION: Record<TrainingPriorityKey, string> = {
  "Attaquer avant de jouer sa main": "Pendant les trois prochaines parties, annonce toutes tes attaques avant de jouer une carte.",
  "Éviter l'overcounter": "Avant chaque défense, calcule la valeur exacte nécessaire pour counter.",
  "Améliorer le sequencing": "Pendant les trois prochaines parties, planifie l'ordre complet de tes attaques avant de déclarer la première.",
  "Maîtriser sa curve": "Pendant les trois prochaines parties, joue une carte à coût raisonnable dès que possible, même imparfaite.",
  "Comprendre le tempo": "Avant chaque action, demande-toi : est-ce que ça avance mon plan de jeu ce tour-ci ?",
  "Améliorer le counter math": "Avant chaque défense, calcule la valeur exacte nécessaire pour counter.",
  "Contrôler le board": "À chaque tour adverse, identifie la carte la plus menaçante de son board avant le tien.",
  "Calculer le lethal": "À chaque tour, vérifie si tu as lethal avant de développer ton board.",
  "Suivre la main adverse": "Note la taille de la main adverse au début de chaque tour.",
  "Améliorer la connaissance du matchup": "Avant chaque partie, relis la carte ou l'effet clé du deck adverse que tu affrontes.",
  "Gérer le crackback": "En fin de ton tour, demande-toi ce que l'adversaire peut te renvoyer au tour suivant et garde de quoi l'encaisser.",
  "Choisir correctement entre attaquer la Life et le board": "Avant chaque attaque, choisis consciemment : Life adverse ou board adverse, et justifie ce choix en une phrase.",
};

export interface MatchTagSample {
  id: string;
  date: string;
  tags: string[];
}

export interface TrainingPriorityResult {
  hasData: boolean;
  reason?: string;
  priority?: TrainingPriorityKey;
  why?: string;
  matchCount?: number;
  mission?: string;
}

const TRAINING_PRIORITY_WINDOW = 15;
const MIN_SAMPLE_FOR_PRIORITY = 3;

/**
 * Sélectionne la priorité d'entraînement à partir des défaites récentes
 * (fenêtre glissante) — jamais de priorité annoncée sous
 * MIN_SAMPLE_FOR_PRIORITY occurrences du même sujet.
 */
export function computeTrainingPriority(recentDefeats: MatchTagSample[]): TrainingPriorityResult {
  const window = recentDefeats.slice(0, TRAINING_PRIORITY_WINDOW);
  const byPriority = new Map<TrainingPriorityKey, Set<string>>();
  for (const m of window) {
    for (const tag of m.tags) {
      const p = TAG_TO_PRIORITY[tag];
      if (!p) continue;
      if (!byPriority.has(p)) byPriority.set(p, new Set());
      byPriority.get(p)!.add(m.id);
    }
  }

  let best: { priority: TrainingPriorityKey; matchIds: Set<string> } | null = null;
  for (const [priority, matchIds] of byPriority) {
    if (!best || matchIds.size > best.matchIds.size) best = { priority, matchIds };
  }

  if (!best || best.matchIds.size < MIN_SAMPLE_FOR_PRIORITY) {
    return {
      hasData: false,
      reason: `${window.length} défaite(s) récente(s) analysée(s), mais aucun sujet ne revient encore sur au moins ${MIN_SAMPLE_FOR_PRIORITY} d'entre elles — continue à enregistrer tes parties avec le détail des erreurs.`,
    };
  }

  return {
    hasData: true,
    priority: best.priority,
    why: `Ce sujet revient sur ${best.matchIds.size} de tes ${window.length} dernière(s) défaite(s) enregistrée(s) avec détail.`,
    matchCount: best.matchIds.size,
    mission: PRIORITY_MISSION[best.priority],
  };
}

// ---------------------------------------------------------------------
// 9. Évolution des erreurs dans le temps (section 7).
// ---------------------------------------------------------------------

export interface MistakeTrendEntry {
  mistake: string;
  recentCount: number;
  previousCount: number;
  direction: "up" | "down" | "stable";
}

export interface MistakeTrendResult {
  hasData: boolean;
  reason?: string;
  entries: MistakeTrendEntry[];
}

const TREND_WINDOW = 8;
const MIN_SAMPLE_FOR_TREND = 6;

/**
 * Compare la fréquence de chaque erreur sur les TREND_WINDOW défaites les
 * plus récentes contre les TREND_WINDOW précédentes — jamais de tendance
 * affichée sous MIN_SAMPLE_FOR_TREND défaites taguées au total.
 */
export function computeMistakeTrend(defeatsDesc: MatchTagSample[]): MistakeTrendResult {
  const tagged = defeatsDesc.filter((m) => m.tags.length > 0);
  if (tagged.length < MIN_SAMPLE_FOR_TREND) {
    return {
      hasData: false,
      reason: `${tagged.length} défaite(s) avec détail enregistré — il en faut au moins ${MIN_SAMPLE_FOR_TREND} pour comparer une tendance dans le temps.`,
      entries: [],
    };
  }

  const recent = tagged.slice(0, TREND_WINDOW);
  const previous = tagged.slice(TREND_WINDOW, TREND_WINDOW * 2);

  const countTags = (list: MatchTagSample[]) => {
    const counts = new Map<string, number>();
    for (const m of list) for (const t of m.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return counts;
  };
  const recentCounts = countTags(recent);
  const previousCounts = countTags(previous);

  const allTags = new Set([...recentCounts.keys(), ...previousCounts.keys()]);
  const entries: MistakeTrendEntry[] = Array.from(allTags).map((mistake) => {
    const r = recentCounts.get(mistake) ?? 0;
    const p = previousCounts.get(mistake) ?? 0;
    return { mistake, recentCount: r, previousCount: p, direction: r > p ? "up" : r < p ? "down" : "stable" };
  });

  entries.sort((a, b) => b.recentCount - a.recentCount || b.previousCount - a.previousCount);

  return { hasData: true, entries: entries.slice(0, 5) };
}

// ---------------------------------------------------------------------
// 9bis. Scores de compétence (section 14) — 6 indicateurs directement
//    issus des classifications de l'analyse du coach (pas une nouvelle
//    taxonomie). "Données insuffisantes" sous 5 défaites documentées ;
//    au-delà, chaque compétence reçoit un statut basé sur sa fréquence
//    récente vs précédente — jamais uniquement basé sur le winrate (une
//    défaite bien jouée ne dégrade pas un score).
// ---------------------------------------------------------------------

export const SKILL_SCORE_CLASSIFICATIONS = [
  "Sequencing",
  "Counter management",
  "Curve",
  "Tempo",
  "Board control",
  "Lethal calculation",
] as const;
export type SkillScoreKey = (typeof SKILL_SCORE_CLASSIFICATIONS)[number];

export interface SkillScoreSample {
  id: string;
  date: string;
  classification: ClassificationKey;
  classificationSecondary: ClassificationKey[];
}

export type SkillScoreStatus = "en progression" | "stable" | "en baisse" | "priorité actuelle";

export interface SkillScoreEntry {
  skill: SkillScoreKey;
  status: SkillScoreStatus;
  recentCount: number;
  previousCount: number;
}

export interface SkillScoreResult {
  hasData: boolean;
  reason?: string;
  documentedCount?: number;
  entries?: SkillScoreEntry[];
}

const MIN_DOCUMENTED_FOR_SKILL_SCORES = 5;
const SKILL_PRIORITY_MIN_COUNT = 3;

/**
 * `samplesDesc` = défaites documentées (avec analyse du coach), triées de
 * la plus récente à la plus ancienne. Découpe en deux moitiés (récente /
 * précédente) plutôt qu'une fenêtre fixe, pour rester valide dès le seuil
 * minimum atteint.
 */
export function computeSkillScores(samplesDesc: SkillScoreSample[]): SkillScoreResult {
  if (samplesDesc.length < MIN_DOCUMENTED_FOR_SKILL_SCORES) {
    return {
      hasData: false,
      reason: `${samplesDesc.length} défaite(s) documentée(s) — il en faut au moins ${MIN_DOCUMENTED_FOR_SKILL_SCORES} pour calculer des indicateurs par compétence.`,
    };
  }

  const mid = Math.ceil(samplesDesc.length / 2);
  const recent = samplesDesc.slice(0, mid);
  const previous = samplesDesc.slice(mid);

  function countFor(list: SkillScoreSample[], skill: SkillScoreKey): number {
    return list.filter((s) => s.classification === skill || s.classificationSecondary.includes(skill)).length;
  }

  const recentTotals = SKILL_SCORE_CLASSIFICATIONS.map((skill) => ({ skill, count: countFor(recent, skill) }));
  const topSkill = recentTotals.reduce((best, cur) => (cur.count > best.count ? cur : best), recentTotals[0]);

  const entries: SkillScoreEntry[] = SKILL_SCORE_CLASSIFICATIONS.map((skill) => {
    const r = countFor(recent, skill);
    const p = countFor(previous, skill);
    let status: SkillScoreStatus;
    if (skill === topSkill.skill && topSkill.count >= SKILL_PRIORITY_MIN_COUNT) {
      status = "priorité actuelle";
    } else if (r < p) {
      status = "en progression";
    } else if (r > p) {
      status = "en baisse";
    } else {
      status = "stable";
    }
    return { skill, status, recentCount: r, previousCount: p };
  });

  return { hasData: true, documentedCount: samplesDesc.length, entries };
}

// ---------------------------------------------------------------------
// 10. Petit utilitaire partagé — même logique que `matchMistakes` dans
//     personalStats.ts (non touché ici pour ne rien casser), dupliquée
//     volontairement pour garder ce module sans dépendance externe.
// ---------------------------------------------------------------------

export function parseMatchTags(match: { mistakesJson?: string | null; mainMistake?: string | null }): string[] {
  if (match.mistakesJson) {
    try {
      const parsed = JSON.parse(match.mistakesJson);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // Ignoré volontairement — un JSON malformé ne doit jamais faire
      // planter l'analyse, juste retomber sur mainMistake ci-dessous.
    }
  }
  return match.mainMistake ? [match.mainMistake] : [];
}
