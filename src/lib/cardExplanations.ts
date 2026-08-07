export interface CardExplanation {
  howItWorksEn: string;
  howItWorksFr: string;
  mihawkAnalysisFr: string;
}

/**
 * Explications originales, rédigées à la main, pour les cartes du deck
 * Mihawk actuel de l'utilisateur. Ce ne sont ni le texte officiel ni une
 * traduction de celui-ci — ce sont des reformulations pédagogiques de la
 * mécanique de jeu, dans le but d'expliquer le "comment" et le "pourquoi"
 * plutôt que de reproduire le wording de la carte.
 *
 * Volontairement limité aux cartes du deck actuel : les rédiger une par une
 * garantit qu'elles restent de vraies explications originales, pas un
 * texte généré automatiquement à partir du texte scrapé.
 */
export const CARD_EXPLANATIONS: Record<string, CardExplanation> = {
  "OP07-022": {
    howItWorksEn: "Otama digs into your deck for Wano-related pieces when she enters play, helping you find the specific cards your hand is missing rather than drawing blind.",
    howItWorksFr: "Otama va chercher des pièces liées à Wano dans ton deck dès son arrivée en jeu, ce qui te permet de trouver précisément la carte qui te manque plutôt que de piocher au hasard.",
    mihawkAnalysisFr: "Bon point d'entrée à coût faible qui améliore la régularité de la main et alimente les synergies Wano du deck.",
  },
  "OP12-034": {
    howItWorksEn: "Perona searches your deck for an Event when she's played, letting you tailor your hand to whatever the current situation calls for.",
    howItWorksFr: "Perona cherche un Event dans ton deck quand elle est jouée, ce qui te permet d'adapter ta main à la situation du moment plutôt que de subir ta pioche.",
    mihawkAnalysisFr: "Recherche flexible qui aide à trouver l'Event le plus utile selon le matchup — évite de piocher automatiquement la carte la plus puissante sur le papier.",
  },
  "OP14-023": {
    howItWorksEn: "Kikunojo can be rested to power up the leader's DON!! recovery, then naturally stands back up at the end of your turn.",
    howItWorksFr: "Kikunojo peut être reposée pour alimenter la récupération de DON!! du Leader, puis redevient active toute seule en fin de tour.",
    mihawkAnalysisFr: "Cible idéale à reposer pour l'effet Leader de Mihawk puisqu'elle revient active en End Phase — quasiment sans coût réel.",
  },
  "ST32-001": {
    howItWorksEn: "Kin'emon lets you swap out a card you no longer need from your hand for a fresh one from the top of your deck, filtering dead draws into something usable.",
    howItWorksFr: "Kin'emon permet d'échanger une carte devenue inutile dans ta main contre une nouvelle carte du dessus du deck, ce qui transforme une pioche morte en ressource utilisable.",
    mihawkAnalysisFr: "Excellent en early game pour filtrer une carte trop chère à jouer tout de suite contre quelque chose de plus immédiatement utile.",
  },
  "ST32-005": {
    howItWorksEn: "This Zoro brings solid stats and a reliable Counter to the table, giving you a defensive option that also holds its own offensively.",
    howItWorksFr: "Ce Zoro apporte de bonnes statistiques et un Counter fiable, offrant une option défensive qui reste également correcte en attaque.",
    mihawkAnalysisFr: "Profite du bonus +1000 passif de Mihawk contre les leaders Tranchant, et renforce la consistance défensive early-game du deck.",
  },
  "OP10-030": {
    howItWorksEn: "Smoker hits hard and forces the opponent to think twice about blocking, since letting his attack through to Life comes with an extra cost via Banish.",
    howItWorksFr: "Smoker frappe fort et pousse l'adversaire à réfléchir avant de bloquer, car laisser passer son attaque sur la Life coûte plus cher que d'habitude grâce à Banish.",
    mihawkAnalysisFr: "Très bon second body développé via ST32 Mihawk, mais l'absence de Counter augmente le risque de main lourde si tu en gardes trop en main.",
  },
  "OP14-033": {
    howItWorksEn: "This Perona can lock down opposing Characters on entry, temporarily taking them out of the equation and buying you time to develop your own board.",
    howItWorksFr: "Cette Perona peut neutraliser des personnages adverses à son arrivée, les mettant temporairement hors-jeu et te laissant le temps de développer ton propre board.",
    mihawkAnalysisFr: "Coûte 5, donc active directement l'effet Leader de Mihawk tout en retardant le plan de jeu adverse.",
  },
  "ST32-002": {
    howItWorksEn: "Oden combines solid stats with card advantage, helping you keep your hand stocked while also contributing meaningfully to the board.",
    howItWorksFr: "Oden combine de bonnes statistiques avec de l'avantage de cartes, t'aidant à garder une main fournie tout en apportant une vraie contribution au board.",
    mihawkAnalysisFr: "Considérée comme un incontournable du deck : coût 5 (active Mihawk), Slash, Wano, Counter et pioche réunis sur une seule carte.",
  },
  "OP13-031": {
    howItWorksEn: "Law can bring back a Character you already used from your trash into your hand, letting you reuse its effect later in the game.",
    howItWorksFr: "Law peut ramener dans ta main un personnage déjà utilisé depuis ta défausse, te permettant de réutiliser son effet plus tard dans la partie.",
    mihawkAnalysisFr: "Moteur de recyclage : redonne de la valeur à tes Searchers déjà dépensés, particulièrement fort en milieu/fin de partie.",
  },
  "ST32-003": {
    howItWorksEn: "This Mihawk lets you deploy a second compatible low-cost Character for free the moment he enters play, then rewards resting him with extra hand filtering.",
    howItWorksFr: "Ce Mihawk te permet de développer gratuitement un second personnage compatible à coût faible dès son entrée en jeu, puis récompense le fait de le reposer en filtrant ta main.",
    mihawkAnalysisFr: "Carte centrale du deck : elle crée deux corps sur le board en une seule séquence et synergise particulièrement bien avec Oden, Perona et Smoker.",
  },
  "OP14-119": {
    howItWorksEn: "This big Mihawk hits extremely hard and is difficult to remove, acting as a defensive wall the opponent has to respect.",
    howItWorksFr: "Ce gros Mihawk frappe très fort et est difficile à retirer, jouant le rôle de mur défensif que l'adversaire doit respecter.",
    mihawkAnalysisFr: "Très puissant mais sans Counter et coûteux — utile en petite quantité, risqué en main lourde si tu en as plusieurs simultanément.",
  },
  "ST24-004": {
    howItWorksEn: "Law & Bepo closes out games with a huge body and can make your Leader significantly harder to attack profitably.",
    howItWorksFr: "Law & Bepo termine les parties avec un corps imposant et peut rendre ton Leader beaucoup plus difficile à attaquer rentablement.",
    mihawkAnalysisFr: "Excellent finisher de fin de partie et bon outil défensif pour protéger tes points de vie dans les matchups longs.",
  },
  "OP01-055": {
    howItWorksEn: "This Event lets you cash in Characters that already used their on-play effect for a fresh pair of cards, turning \"used up\" pieces into new resources.",
    howItWorksFr: "Cet Event te permet d'échanger des personnages ayant déjà utilisé leur effet d'arrivée contre deux nouvelles cartes, transformant des pièces \"épuisées\" en nouvelles ressources.",
    mihawkAnalysisFr: "Excellent moteur de pioche une fois tes Searchers dépensés — particulièrement fort combiné avec Kikunojo qui revient active en fin de tour.",
  },
  "OP12-037": {
    howItWorksEn: "This Event temporarily shuts down a couple of opposing cards by spending DON!!, and pairs naturally with Mihawk's ability to bring that DON!! straight back.",
    howItWorksFr: "Cet Event neutralise temporairement quelques cartes adverses en dépensant du DON!!, et s'associe naturellement avec la capacité de Mihawk à récupérer ce DON!! immédiatement.",
    mihawkAnalysisFr: "Combo de tempo fort avec l'effet Leader : le DON!! dépensé pour contrôler l'adversaire peut être quasiment récupéré dans la foulée.",
  },
  "OP13-040": {
    howItWorksEn: "This Event locks down a couple of opposing Characters by spending DON!!, and — like the other DON!!-based Events — synergizes with Mihawk's DON!! recovery.",
    howItWorksFr: "Cet Event verrouille quelques personnages adverses en dépensant du DON!!, et — comme les autres Events basés sur le DON!! — s'associe bien avec la récupération de DON!! de Mihawk.",
    mihawkAnalysisFr: "Excellent event de contrôle à haute valeur, dont le coût en DON!! peut être largement compensé par l'effet Leader le même tour.",
  },
  "OP14-039": {
    howItWorksEn: "Coffin Boat draws you a card on entry and helps refresh your DON!! at the end of the turn, providing steady long-term value.",
    howItWorksFr: "Coffin Boat te fait piocher une carte à son arrivée et aide à rafraîchir ton DON!! en fin de tour, apportant une valeur régulière sur la durée.",
    mihawkAnalysisFr: "Bonne carte de valeur sur le long terme, mais trop lente pour rivaliser face à des decks très agressifs qui ne te laissent pas le temps de l'exploiter.",
  },
};
