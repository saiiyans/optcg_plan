export interface MatchupTip {
  opponent: string;
  difficulty: "Favorable" | "Défavorable" | "Serré" | "À tester";
  why: string;
  howToCounter: string[];
  /** Rang / winrate / taux de jeu actuel, quand connu — voir META_LEADER_SNAPSHOT plus bas pour la source. */
  currentMeta?: string;
}

export interface MetaLeaderRank {
  rank: number;
  trend: "up" | "down" | "stable";
  name: string;
  cardNumber: string;
  wtdWinRate: number; // winrate pondéré par taille d'échantillon
  rawWinRate: number;
  playRate: number; // % des parties du format jouées avec ce leader
}

// Classement des leaders les plus joués du format actuel — capturé à la main
// le 27/08/2026 sur cardkaizoku.com/ranking, filtre "OP17 Last Week (All
// Lobbies)" (1 945 366 parties recensées sur la période). C'est un SNAPSHOT
// figé au moment de la capture, pas une donnée qui se rafraîchit toute
// seule (contrairement à la grille leader-vs-leader ci-dessus dans /matchups,
// qui vient d'opdecks.xyz et se rafraîchit sur clic) — revisite le site
// pour les derniers chiffres si besoin.
export const META_LEADER_SNAPSHOT: MetaLeaderRank[] = [
  { rank: 1, trend: "stable", name: "Sabo", cardNumber: "OP13-004", wtdWinRate: 54.44, rawWinRate: 54.91, playRate: 11.38 },
  { rank: 2, trend: "stable", name: "Nico Robin", cardNumber: "OP09-062", wtdWinRate: 53.07, rawWinRate: 53.98, playRate: 5.42 },
  { rank: 3, trend: "stable", name: "Charlotte Linlin", cardNumber: "OP17-099", wtdWinRate: 52.38, rawWinRate: 53.64, playRate: 3.74 },
  { rank: 4, trend: "stable", name: "Portgas D. Ace", cardNumber: "OP16-001", wtdWinRate: 52.01, rawWinRate: 52.68, playRate: 6.9 },
  { rank: 5, trend: "up", name: "Dracule Mihawk", cardNumber: "OP14-020", wtdWinRate: 51.89, rawWinRate: 52.33, playRate: 10.36 },
  { rank: 6, trend: "down", name: "Kaido", cardNumber: "OP17-058", wtdWinRate: 51.48, rawWinRate: 51.91, playRate: 10.38 },
  { rank: 7, trend: "up", name: "Rocks D. Xebec", cardNumber: "OP17-039", wtdWinRate: 51.28, rawWinRate: 51.73, playRate: 9.86 },
  { rank: 8, trend: "down", name: "Monkey D. Luffy", cardNumber: "OP17-079", wtdWinRate: 51.26, rawWinRate: 52.15, playRate: 4.87 },
  { rank: 9, trend: "stable", name: "Luffy & Ace", cardNumber: "ST30-001", wtdWinRate: 51.04, rawWinRate: 53.73, playRate: 1.6 },
  { rank: 10, trend: "stable", name: "Boa Hancock", cardNumber: "OP14-041", wtdWinRate: 49.15, rawWinRate: 51.44, playRate: 1.64 },
];

export const META_SNAPSHOT_SOURCE =
  "Classement capturé le 27 août 2026 sur cardkaizoku.com/ranking (filtre \"OP17 Last Week, All Lobbies\", 1 945 366 parties sur la période). Wtd WR = winrate pondéré par taille d'échantillon (se rapproche du winrate brut quand il y a beaucoup de parties). Snapshot figé — pas de rafraîchissement automatique.";

export interface LeaderMatchupGuide {
  leaderKey: "mihawk";
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
      "Classement actuel (cardkaizoku.com, format OP17, 27 août 2026) : Mihawk est #5 sur 117 leaders recensés, winrate pondéré 51,89% (brut 52,33%), taux de jeu 10,36% — c'est le 2ᵉ leader le plus joué du format actuel, juste derrière Sabo, et il a gagné un rang sur la semaine. Donnée plus ancienne mais toujours utile sur le fond du jeu : sur 37 312 parties en OP16 (opdeckguide.com, août 2026), le winrate global était de 52,6%, avec un net avantage à jouer en second (56,1% vs 43,9% en premier) — Mihawk profite davantage de voir le board adverse avant d'agir que de prendre l'initiative.",
    worstMatchups: [
      // --- AJOUT 27/08/2026, complété 29/08/2026 — les leaders les plus
      // joués du format actuel (cardkaizoku.com, voir META_LEADER_SNAPSHOT)
      // n'avaient aucune fiche dans l'app. Le 29/08/2026, chaque leader a été
      // recherché individuellement (onepiece.gg, opdeckguide.com,
      // spellmana.com) pour remplacer le conseil générique par le vrai plan
      // de deck adverse. Deux matchups ont pu passer à un verdict confirmé
      // par une source externe explicite (Rocks D. Xebec — attribut Slash
      // confirmé, en lien direct avec le bonus de Mihawk ; Monkey D. Luffy
      // OP17-079 — cité comme défavorable pour Luffy par sa propre source).
      // Pour les autres, aucune source consultée ne donne de verdict
      // Mihawk-contre-ce-leader précis : ils restent "À tester", mais avec
      // le vrai plan de jeu adverse plutôt qu'un conseil générique. Honnêteté
      // d'abord — jamais de tactique inventée pour combler un manque de
      // source.
      {
        opponent: "Sabo (OP13-004)",
        difficulty: "À tester",
        why: "Deck Rouge/Noir tempo-combo (source : onepiece.gg) — l'effet leader donne +1000 de puissance (leader + tous les personnages) tant qu'un personnage coût 8+ posé avec 1 DON!! est en jeu, un bonus qui monte jusqu'à 6000 de puissance quand Sabo est à 3 vies ou moins ; le deck referme la partie via une récursion de cimetière avec Monkey D. Dragon. Leader #1 du format actuel (11,38% des parties, meilleur winrate pondéré du classement, 54,44%) — statistiquement l'adversaire le plus fréquent en tournoi. Aucun verdict de matchup spécifique contre Mihawk trouvé dans les sources consultées : ce qui précède décrit le plan du deck Sabo lui-même, pas un rapport de force confirmé contre Mihawk.",
        howToCounter: [
          "Presser tôt et éviter de laisser Sabo descendre confortablement à 3 vies ou moins — c'est le palier qui active son bonus de puissance maximal (6000).",
          "Cibler en priorité le personnage coût 8+/1 DON!! qui active le bonus leader plutôt qu'un attaquant secondaire — sans lui, l'effet leader ne s'active pas.",
          "Garder un œil sur Monkey D. Dragon en fin de partie : c'est la pièce de récursion qui referme la partie, une bonne cible pour un verrouillage (rest-lock) si tu en as un disponible.",
          "Logue tes parties contre ce leader dans le Journal — reste la meilleure source pour un vrai verdict de matchup, vu sa fréquence.",
        ],
        currentMeta: "Rang 1/117 · 11,38% des parties · winrate pondéré 54,44% (cardkaizoku.com, 27/08/2026)",
      },
      {
        opponent: "Kaido (OP17-058)",
        difficulty: "À tester",
        why: "Deck Violet ramp vers 10 DON!! (source : opdeckguide.com) — Queen recycle la main, King (coût 6) est la pièce maîtresse pour récupérer du DON!!. Faiblesse documentée par la source : un début de partie inconsistant/friable, vulnérable à l'agression lourde. 3ᵉ leader le plus joué du format actuel (10,38% des parties) — presque aussi fréquent que Mihawk lui-même. Aucun verdict de matchup spécifique contre Mihawk trouvé : Mihawk n'étant pas un deck d'agression pure, cette faiblesse documentée ne se traduit pas forcément en avantage direct.",
        howToCounter: [
          "Le deck est documenté comme faible en early-game si sa main est mauvaise ('main friable') — presser tôt reste une piste sérieuse même si Mihawk n'est pas un deck d'agression pure.",
          "Repérer King (coût 6) : c'est la pièce qui relance le DON!! adverse, une cible logique pour ton verrouillage (rest-lock) si tu dois choisir.",
          "Logue tes parties contre ce leader dans le Journal — priorité haute vu sa fréquence en table.",
        ],
        currentMeta: "Rang 6/117 · 10,38% des parties · winrate pondéré 51,48% (cardkaizoku.com, 27/08/2026)",
      },
      {
        opponent: "Rocks D. Xebec (OP17-039)",
        difficulty: "Favorable",
        why: "Deck Bleu midrange Rocks Pirates (source : opdeckguide.com) — et surtout : Rocks D. Xebec est un leader à attribut Tranchant (Slash), confirmé par la source elle-même qui cite explicitement un désavantage « contre des matchups spécifiques comme les decks Mihawk ». C'est directement le bonus passif +1000 de Mihawk contre tout attribut Slash (voir plus haut) — un des rares matchups de cette liste avec un vrai lien mécanique confirmé par une source externe, pas une supposition. Faiblesse propre au deck Rocks (source) : pas de main de Counter sans carte Stage posée. 4ᵉ leader le plus joué du format actuel (9,86% des parties).",
        howToCounter: [
          "Exploiter le bonus +1000 systématique contre son attribut Tranchant (Slash) — engage le combat plus franchement que d'habitude, ce matchup encaisse mieux les échanges directs.",
          "Repérer si l'adversaire a une carte Stage posée : sans elle, le deck Rocks n'a pas de main de Counter (faiblesse documentée) — un bon moment pour presser.",
          "Ce matchup a une base mécanique confirmée par une source externe (attribut Slash) — reste une bonne priorité à confirmer via tes propres parties dans le Journal pour valider le winrate réel.",
        ],
        currentMeta: "Rang 7/117 · 9,86% des parties · winrate pondéré 51,28% (cardkaizoku.com, 27/08/2026)",
      },
      {
        opponent: "Portgas D. Ace (OP16-001)",
        difficulty: "À tester",
        why: "Deck Rouge (source : spellmana.com) — construit des personnages Barbe Blanche/Luffy à haute puissance ; l'effet leader donne Rush à partir de 8000 de puissance, et en milieu de partie un Ace coût 5 convertit la puissance en main en ressources Counter tout en cherchant des cartes. Le deck passe d'un early-game maîtrisé à une explosion offensive. Version actuelle (OP16-001), très différente de l'ancienne impression (OP13-002, aujourd'hui tout en bas du classement) — top 4 du classement actuel (6,90% des parties). Aucun verdict de matchup spécifique contre Mihawk trouvé dans les sources consultées.",
        howToCounter: [
          "Le seuil de Rush à 8000 de puissance est le vrai point de bascule du deck — garder un Counter fort ou un verrouillage pour la première grosse attaque après ce seuil plutôt que de le dépenser avant.",
          "L'Ace coût 5 est la pièce qui transforme la main adverse en pression (ressources Counter + recherche de cartes) — une cible utile pour un rest-lock si tu dois prioriser.",
          "Bien vérifier le numéro de carte (OP16-001, à ne pas confondre avec l'ancienne version OP13-002) avant de comparer tes notes de matchup.",
          "Logue tes parties contre ce leader dans le Journal.",
        ],
        currentMeta: "Rang 4/117 · 6,90% des parties · winrate pondéré 52,01% (cardkaizoku.com, 27/08/2026)",
      },
      {
        opponent: "Nico Robin (OP09-062)",
        difficulty: "À tester",
        why: "Deck Violet/Jaune ramp (source : onepiece.gg) — l'effet leader donne un DON!! reposé à chaque attaque de Robin en échange de défausser une carte Trigger de la main, ce qui permet de jouer des personnages à haut coût dès le tour 3. Le mot-clé Bannissement (Banish) sur ses attaques force l'adversaire à dépenser des ressources Counter. Faiblesses documentées par la source : Doflamingo Bleu (agression qui épuise les Counters), Shanks Rouge (réduction de puissance), Marshall D. Teach Noir (désactive les effets « à la pose » + réduction de coût qui menace le board) — Mihawk n'apparaît dans aucune des trois. 2ᵉ meilleur winrate pondéré du classement actuel (53,07%), 5,42% des parties, aucun verdict de matchup spécifique contre Mihawk trouvé.",
        howToCounter: [
          "Le mot-clé Bannissement force une dépense de Counter à chaque attaque de Robin — anticiper cette pression sur tes ressources plutôt que de les garder pour plus tard.",
          "Le ramp démarre dès le tour 3 via la défausse de cartes Trigger — repérer si l'adversaire garde ou défausse ses Trigger donne une bonne indication de son plan.",
          "Logue tes parties contre ce leader dans le Journal — aucune des trois faiblesses documentées par les sources ne concerne Mihawk directement, donc ta propre donnée est ici particulièrement utile.",
        ],
        currentMeta: "Rang 2/117 · 5,42% des parties · winrate pondéré 53,07% (cardkaizoku.com, 27/08/2026)",
      },
      {
        opponent: "Monkey D. Luffy (OP17-079)",
        difficulty: "Favorable",
        why: "Deck Noir swarm autour des personnages Elbaph (source : opdeckguide.com) — courbe « 2, 4, 6 puis 8 DON!! », l'effet leader donne le statut Bloqueur à tous les personnages coût 12+. Pièces clés : Usopp (coût 2, cherche des cartes Elbaph), Jaguar D. Saul (coût 4, installe des menaces coût 12), Loki (coût 6), Luffy (coût 8, pioche + recycle des persos coût 2 depuis le cimetière). La source cite explicitement Dracule Mihawk parmi les matchups défavorables pour ce deck Luffy (avec Kaido et Portgas D. Ace) — un des rares matchups de cette liste avec une confirmation directe et sourcée, cette fois dans le bon sens. Impression OP17, distincte de la version Vert/Bleu (OP16-022) déjà couverte plus bas — 4,87% des parties du format actuel.",
        howToCounter: [
          "C'est un des matchups les mieux confirmés de cette liste (source externe explicite) — joue ton plan habituel de contrôle du tempo avec confiance plutôt que de sur-adapter.",
          "Le deck a une courbe stricte (2/4/6/8 DON!!) — perturber une étape tôt (verrouillage sur Usopp ou Jaguar D. Saul) peut casser tout l'enchaînement plutôt que de viser une pièce plus tardive.",
          "Logue quand même tes parties dans le Journal (bien noter la version : OP17-079) pour confirmer ce winrate favorable avec tes propres chiffres.",
        ],
        currentMeta: "Rang 8/117 · 4,87% des parties · winrate pondéré 51,26% (cardkaizoku.com, 27/08/2026)",
      },
      {
        opponent: "Charlotte Linlin (OP17-099)",
        difficulty: "À tester",
        why: "Deck Jaune « Big Mom Pirates » axé soin et contrôle du board (source : opdeckguide.com), stratégie décrite comme « rope-a-dope » : encaisser l'agression adverse grâce au soin, étaler des personnages Trigger à 4000 de puissance, puis poser la Linlin coût 10 qui transforme tout le board en menaces à 8000 de puissance. Faiblesse documentée par la source : un adversaire qui « l'affame » en évitant de l'attaquer la prive de ses déclenchements de soin ; le board reste aussi fragile (4000 de puissance de base) tant que la finisheuse coût 10 n'est pas arrivée. La source cite Rocks D. Xebec et Monkey D. Luffy OP17 comme matchups difficiles pour Linlin, mais ne mentionne pas Mihawk. 3ᵉ du classement actuel par winrate pondéré (52,38%), 3,74% des parties.",
        howToCounter: [
          "La source documente une vraie faiblesse : éviter d'attaquer son board pour ne pas déclencher ses effets de soin (« l'affamer ») — cohérent avec le plan de jeu naturellement patient de Mihawk, à tester en priorité.",
          "Le board reste à 4000 de puissance de base tant que la Linlin coût 10 n'est pas posée — presser avant l'arrivée de cette carte plutôt qu'après.",
          "Logue tes parties dans le Journal : aucune source consultée ne donne de verdict Mihawk-vs-Linlin direct, ta propre donnée est donc précieuse ici.",
        ],
        currentMeta: "Rang 3/117 · 3,74% des parties · winrate pondéré 52,38% (cardkaizoku.com, 27/08/2026)",
      },
      {
        opponent: "Boa Hancock (OP14-041)",
        difficulty: "À tester",
        why: "Top 10 du classement actuel (1,64% des parties, winrate pondéré 49,15%). Pas de verdict de matchup spécifique contre Mihawk trouvé dans les sources consultées.",
        howToCounter: [
          "Logue tes parties contre ce leader dans le Journal.",
          "Plan de jeu général Mihawk en attendant : contrôle du tempo, verrouillage des pièces clés.",
        ],
        currentMeta: "Rang 10/117 · 1,64% des parties · winrate pondéré 49,15% (cardkaizoku.com, 27/08/2026)",
      },
      {
        opponent: "Miroir (Dracule Mihawk vs Dracule Mihawk)",
        difficulty: "Serré",
        why: "Aucune source externe consultée ne documente ce miroir spécifiquement — l'estimation ci-dessous est un raisonnement générique de miroir entre decks tempo-contrôle identiques (initiative, parité de ressources), pas un résultat observé ou une tier list. Étiqueté « opinion », pas fait constaté — à vérifier en priorité avec tes propres parties, vu que c'est le seul matchup de cette liste où l'adversaire a exactement les mêmes outils que toi.",
        howToCounter: [
          "Le bonus +1000 vs Slash ne s'applique évidemment pas dans un miroir — le matchup se joue sur l'exécution (qui verrouille la bonne pièce au bon moment), pas sur un avantage structurel.",
          "Garder un œil sur qui active en premier l'effet leader (3 DON!! en reposant 1 carte, si un coût 5+ est en jeu) — dans un miroir, prendre cette initiative en premier peut suffire à gagner le tempo.",
          "Logue spécifiquement ces parties dans le Journal — un miroir est justement le genre de matchup où l'expérience personnelle vaut plus que n'importe quelle source publique.",
        ],
      },
      // --- Contenu existant (tier lists/stats publiques OP16) ---
      {
        opponent: "Enel (OP15-058)",
        difficulty: "Défavorable",
        why: "Deck combo/DON!! qui peut assembler un tour explosif si on le laisse s'installer tranquillement ; Mihawk n'a pas d'outil de disruption rapide de ce genre de setup. Cité comme matchup difficile par plusieurs tier lists OP16.",
        howToCounter: [
          "Presser la vie adverse tôt, avant que la combo ne soit en place — ne pas jouer passif",
          "Utiliser le verrouillage (rest-lock) sur la pièce clé qui active la combo plutôt que sur un attaquant classique",
          "Garder des Counters en main pour absorber le tour explosif plutôt que de tout dépenser en pression",
        ],
        currentMeta: "Rang 16/117 · 1,56% des parties · winrate pondéré 46,08% (cardkaizoku.com, 27/08/2026) — nettement moins fréquent qu'en OP16, mais toujours un plan à connaître.",
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
        currentMeta: "Rang 23/117 · 1,10% des parties · winrate pondéré 43,98% (cardkaizoku.com, 27/08/2026) — nettement moins fréquent qu'en OP16.",
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
        currentMeta: "Rang 33/117 · 0,91% des parties · winrate pondéré 41,34% (cardkaizoku.com, 27/08/2026) — devenu rare ; la nouvelle impression Luffy OP17-079 (voir plus haut) est aujourd'hui bien plus jouée.",
      },
      {
        opponent: "Roronoa Zoro (OP12-020) et autres leaders Tranchant (Slash)",
        difficulty: "Favorable",
        why: "Le bonus passif +1000 de Mihawk s'applique automatiquement contre tout leader à attribut Slash — ça change fondamentalement le rapport de force en combat.",
        howToCounter: [
          "Jouer plus agressivement que d'habitude — le bonus de puissance encaisse mieux les échanges directs",
          "Ne pas hésiter à engager le combat plutôt que temporiser, contrairement au plan habituel plus patient",
        ],
        currentMeta: "Rang 42/117 · 0,70% des parties (impression OP12-020 précise, cardkaizoku.com, 27/08/2026) — le bonus Slash de Mihawk s'applique à toute la famille Zoro/leaders Tranchant, pas seulement à cette impression.",
      },
      {
        opponent: "Yamato (OP16-079)",
        difficulty: "À tester",
        why: "Deck avec une boucle de Rush qui peut accélérer dangereusement s'il s'installe — pas de verdict clair trouvé dans les sources publiques pour ce matchup précis contre Mihawk.",
        howToCounter: [
          "Anticiper la boucle avant qu'elle ne s'enclenche plutôt que de réagir après coup",
          "Logue tes parties contre ce leader dans le Journal — c'est le moyen le plus fiable de savoir où tu en es réellement",
        ],
        currentMeta: "Rang 18/117 · 1,33% des parties · winrate pondéré 45,60% (cardkaizoku.com, 27/08/2026).",
      },
      {
        opponent: "Nami (OP11-041)",
        difficulty: "À tester",
        why: "Deck de valeur/contrôle qui joue sur la durée — pas de verdict clair trouvé dans les sources publiques pour ce matchup précis contre Mihawk.",
        howToCounter: [
          "S'attendre à une partie plus longue qu'à l'habitude, ne pas se précipiter",
          "Logue tes parties contre ce leader dans le Journal pour bâtir ta propre donnée",
        ],
        currentMeta: "Rang 26/117 · 0,74% des parties · winrate pondéré 43,30% (cardkaizoku.com, 27/08/2026).",
      },
      {
        opponent: "Imu (OP13-079)",
        difficulty: "À tester",
        why: "Deck de contrôle pur, immunisé au retrait par effet — historiquement un matchup exigeant pour beaucoup de decks Green en OP13/OP14, situation en OP16 non confirmée par les sources trouvées.",
        howToCounter: [
          "Éviter de dépendre d'effets de retrait contre les pièces clés d'Imu",
          "Logue tes parties contre ce leader dans le Journal pour confirmer si la difficulté historique se vérifie toujours",
        ],
        currentMeta: "Rang 31/117 · 0,29% des parties · winrate pondéré 41,53% (cardkaizoku.com, 27/08/2026) — devenu très peu joué.",
      },
      {
        opponent: "Sengoku (OP16-060) / Rosinante (OP12-061)",
        difficulty: "À tester",
        why: "Leaders présents dans le format mais sans verdict de matchup spécifique contre Mihawk trouvé dans les sources publiques consultées.",
        howToCounter: [
          "Pas de conseil fiable à donner sans données — le plus utile est de loguer tes parties contre eux dans le Journal (onglet Préparation Tournoi)",
        ],
        currentMeta: "Sengoku rang 28/117 (0,41% des parties) · Rosinante rang 38/117 (0,27% des parties) — cardkaizoku.com, 27/08/2026, tous deux devenus très peu joués.",
      },
    ],
    sourceNote:
      "Classement basé sur les tier lists publiques OP16 (onepiece.gg, Spell Mana), les statistiques de opdeckguide.com (37 312 parties, format OP16, consultées début août 2026), les guides de deck individuels par leader (onepiece.gg, opdeckguide.com, spellmana.com — consultés le 29/08/2026 pour les 7 leaders les plus joués du format actuel), et le classement des leaders de cardkaizoku.com (format OP17, 27 août 2026, 1 945 366 parties — voir le tableau 'Classement méta actuelle' en haut de cette page pour le détail). Les matchups marqués 'À tester' n'ont pas de verdict Mihawk-contre-ce-leader clair dans ces sources (même quand le plan de deck adverse, lui, est bien documenté) — utilise le bouton 'Rafraîchir depuis mes parties' pour voir ta propre donnée dès que tu en as assez loguée.",
  },
  // Fiche Shanks OP17 retirée — choix du joueur de ne finalement pas jouer
  // ce leader au tournoi.
];

export const OPTCG_RESOURCES = [
  { name: "Limitless (onepiece.limitlesstcg.com)", use: "Base de cartes complète + résultats de tournois bruts, source de l'import de la Bibliothèque." },
  { name: "One Piece Top Decks (onepiecetopdecks.com)", use: "Decklists gagnantes par format, mises à jour régulièrement — source de l'import Winning Decks." },
  { name: "onepiece.gg", use: "Tier lists et guides de deck détaillés par leader, bons pour comprendre le plan de jeu global d'un archétype adverse." },
  { name: "Spell Mana", use: "Tier lists méta et analyses de format, complémentaires à onepiece.gg." },
  { name: "OPDeckGuide (opdeckguide.com)", use: "Statistiques de winrate par ordre de tour, sur de gros échantillons de parties — bon pour des chiffres concrets plutôt que des impressions." },
  { name: "Metafy", use: "Guides écrits par des joueurs compétitifs, parfois avec des breakdowns de matchups précis (dont un guide dédié Mihawk)." },
  { name: "Car D. Kaizoku (cardkaizoku.com)", use: "Classement des leaders quasi en temps réel (winrate pondéré/brut, taux de jeu, tendance), filtrable par format — source du 'Classement méta actuelle' affiché sur cette page." },
];
