export interface MatchupTip {
  opponent: string;
  difficulty: "Favorable" | "Défavorable" | "Serré" | "À tester";
  why: string;
  howToCounter: string[];
}

export interface LeaderMatchupGuide {
  leaderKey: "mihawk" | "shanks";
  gameplanSummary: string;
  strengths: string[];
  keyStats?: string; // chiffre concret sourcé, quand disponible
  worstMatchups: MatchupTip[];
  sourceNote: string;
}

export const MATCHUP_GUIDES: LeaderMatchupGuide[] = [
  {
    leaderKey: "mihawk",
    gameplanSummary:
      "Mihawk est un deck de tempo-contrôle : il gagne en gérant le board adverse (verrouillage de cartes reposées), en maximisant l'efficacité de ses ressources et en dictant le rythme de la partie plutôt qu'en cherchant un tour explosif unique.",
    strengths: [
      "+1000 de puissance passif contre tout leader à attribut Tranchant (Slash) — matchup très favorable contre les decks Zoro et assimilés",
      "Effet leader flexible : reposer 1 carte pour activer 3 DON!! si un perso coût 5+ est en jeu, permet d'étaler la pression ou de tout concentrer sur une attaque",
      "OP14-119 (et cartes similaires) peuvent verrouiller une carte adverse reposée — outil de contrôle du tempo",
      "5 vies de départ — le deck a de la marge pour stabiliser avant de reprendre le contrôle",
    ],
    keyStats:
      "Sur 37 312 parties recensées en OP16 (opdeckguide.com, août 2026) : winrate global 52,6%. Détail notable — 43,9% en jouant en premier contre 56,1% en jouant en second. Mihawk profite davantage de voir le board adverse avant d'agir que de prendre l'initiative.",
    worstMatchups: [
      {
        opponent: "Enel (OP15-058)",
        difficulty: "Défavorable",
        why: "Deck combo/DON!! qui peut assembler un tour explosif si on le laisse s'installer tranquillement ; Mihawk n'a pas d'outil de disruption rapide de ce genre de setup. Cité comme matchup difficile par plusieurs tier lists OP16.",
        howToCounter: [
          "Presser la vie adverse tôt, avant que la combo ne soit en place — ne pas jouer passif",
          "Utiliser le verrouillage (rest-lock) sur la pièce clé qui active la combo plutôt que sur un attaquant classique",
          "Garder des Counters en main pour absorber le tour explosif plutôt que de tout dépenser en pression",
        ],
      },
      {
        opponent: "Marshall D. Teach (OP16-080)",
        difficulty: "Défavorable",
        why: "Deck axé sur le retrait de personnages (removal) — un board Mihawk étalé sur plusieurs petits persos se fait démanteler pièce par pièce. Cité comme matchup difficile par plusieurs tier lists OP16.",
        howToCounter: [
          "Séquencer ses persos pour forcer l'adversaire à utiliser son removal sur des pièces secondaires avant de poser les cartes clés",
          "Préférer concentrer la pression via l'effet leader (DON!! sur un seul attaquant) plutôt que d'étaler un board large et vulnérable",
          "Ne pas surinvestir en une seule attaque massive si l'adversaire a clairement du Counter en réserve",
        ],
      },
      {
        opponent: "Luffy Vert/Bleu (OP16-022)",
        difficulty: "Défavorable",
        why: "Deck agressif qui cherche à clôturer vite ; Mihawk, plus lent à s'installer, peut se retrouver sous pression de vie avant d'avoir pris le contrôle du board. Cité comme matchup difficile par plusieurs tier lists OP16.",
        howToCounter: [
          "Prioriser les blocklists/Counters en main plutôt que le développement pur les premiers tours",
          "Utiliser l'effet leader défensivement (garder du DON!! actif pour un Counter fort) plutôt que d'attaquer à tout prix",
          "Ne pas paniquer sur la vie — Mihawk part avec 5 vies, le matchup se regagne souvent en milieu de partie une fois le board stabilisé",
        ],
      },
      {
        opponent: "Roronoa Zoro (OP12-020) et autres leaders Tranchant (Slash)",
        difficulty: "Favorable",
        why: "Le bonus passif +1000 de Mihawk s'applique automatiquement contre tout leader à attribut Slash — ça change fondamentalement le rapport de force en combat.",
        howToCounter: [
          "Jouer plus agressivement que d'habitude — le bonus de puissance encaisse mieux les échanges directs",
          "Ne pas hésiter à engager le combat plutôt que temporiser, contrairement au plan habituel plus patient",
        ],
      },
      {
        opponent: "Yamato (OP16-079)",
        difficulty: "À tester",
        why: "Deck avec une boucle de Rush qui peut accélérer dangereusement s'il s'installe — pas de verdict clair trouvé dans les sources publiques pour ce matchup précis contre Mihawk.",
        howToCounter: [
          "Anticiper la boucle avant qu'elle ne s'enclenche plutôt que de réagir après coup",
          "Logue tes parties contre ce leader dans le Journal — c'est le moyen le plus fiable de savoir où tu en es réellement",
        ],
      },
      {
        opponent: "Nami (OP11-041)",
        difficulty: "À tester",
        why: "Deck de valeur/contrôle qui joue sur la durée — pas de verdict clair trouvé dans les sources publiques pour ce matchup précis contre Mihawk.",
        howToCounter: [
          "S'attendre à une partie plus longue qu'à l'habitude, ne pas se précipiter",
          "Logue tes parties contre ce leader dans le Journal pour bâtir ta propre donnée",
        ],
      },
      {
        opponent: "Imu (OP13-079)",
        difficulty: "À tester",
        why: "Deck de contrôle pur, immunisé au retrait par effet — historiquement un matchup exigeant pour beaucoup de decks Green en OP13/OP14, situation en OP16 non confirmée par les sources trouvées.",
        howToCounter: [
          "Éviter de dépendre d'effets de retrait contre les pièces clés d'Imu",
          "Logue tes parties contre ce leader dans le Journal pour confirmer si la difficulté historique se vérifie toujours",
        ],
      },
      {
        opponent: "Sengoku (OP16-060) / Rosinante (OP12-061) / Boa Hancock (OP14-041) / Portgas D. Ace (OP13-002)",
        difficulty: "À tester",
        why: "Leaders présents dans le format OP16 mais sans verdict de matchup spécifique contre Mihawk trouvé dans les sources publiques consultées.",
        howToCounter: [
          "Pas de conseil fiable à donner sans données — le plus utile est de loguer tes parties contre eux dans le Journal (onglet Préparation Tournoi)",
        ],
      },
    ],
    sourceNote:
      "Classement basé sur les tier lists publiques OP16 (onepiece.gg, Spell Mana) et les statistiques de opdeckguide.com (37 312 parties, format OP16, consultées début août 2026). Les matchups marqués 'À tester' n'ont pas de verdict clair dans ces sources — utilise le bouton 'Rafraîchir depuis mes parties' pour voir ta propre donnée dès que tu en as assez loguée.",
  },
  {
    leaderKey: "shanks",
    gameplanSummary:
      "Package Red-Haired Pirates : verrouillage d'une carte adverse reposée (écho direct de l'effet leader Mihawk mais côté Shanks), Rush pour des finisseurs rapides, et protection des pièces clés via Crone Oli.",
    strengths: [
      "Effet leader : défausser 1 carte ou reposer 1 DON!! pour empêcher un perso adverse reposé de se relever — outil de contrôle de tempo dès le leader",
      "Rush sur plusieurs cartes (ex. Shanks OP17-020, Benn Beckman OP17-027) pour appliquer une pression immédiate",
      "Crone Oli (OP17-021) protège une carte Red-Haired Pirates d'un retrait — résilience face au removal",
    ],
    worstMatchups: [
      {
        opponent: "L'ensemble du champ méta OP16 actuel (Enel, Teach, Luffy G/B, Yamato, Nami, Imu, Rosinante, Sengoku)",
        difficulty: "À tester",
        why: "OP17 sort le 22 août 2026 (JP) — aucun résultat de tournoi n'existe encore. Ce sont les decks que Shanks affrontera très probablement dès sa sortie, d'après le champ OP16 actuel.",
        howToCounter: [
          "Prends les fiches de ces leaders dans le tableau ci-dessus (côté Mihawk) comme point de départ — les plans de jeu adverses ne changent pas selon ton propre leader",
          "Dès les premières parties après le 22 août, logue-les dans le Journal pour remplacer ces hypothèses par de vraies données",
        ],
      },
    ],
    sourceNote:
      "OP17 sort le 22 août 2026 (JP) — aucune donnée de tournoi n'existe encore pour établir de vrais matchups. Les points forts ci-dessus sont déduits du texte des cartes déjà révélées, pas de résultats réels. Cette section se remplira automatiquement une fois des decklists Shanks importées.",
  },
];

export const OPTCG_RESOURCES = [
  { name: "Limitless (onepiece.limitlesstcg.com)", use: "Base de cartes complète + résultats de tournois bruts, source de l'import de la Bibliothèque." },
  { name: "One Piece Top Decks (onepiecetopdecks.com)", use: "Decklists gagnantes par format, mises à jour régulièrement — source de l'import Winning Decks." },
  { name: "onepiece.gg", use: "Tier lists et guides de deck détaillés par leader, bons pour comprendre le plan de jeu global d'un archétype adverse." },
  { name: "Spell Mana", use: "Tier lists méta et analyses de format, complémentaires à onepiece.gg." },
  { name: "OPDeckGuide (opdeckguide.com)", use: "Statistiques de winrate par ordre de tour, sur de gros échantillons de parties — bon pour des chiffres concrets plutôt que des impressions." },
  { name: "Metafy", use: "Guides écrits par des joueurs compétitifs, parfois avec des breakdowns de matchups précis (dont un guide dédié Mihawk)." },
];
