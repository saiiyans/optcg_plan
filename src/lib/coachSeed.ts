import { CARD_EXPLANATIONS } from "./cardExplanations";

function expl(cardNumber: string) {
  const e = CARD_EXPLANATIONS[cardNumber];
  return { coachExplanationEn: e.howItWorksEn, coachExplanationFr: e.howItWorksFr, mihawkAnalysisFr: e.mihawkAnalysisFr };
}

export interface CoachSeedEntry {
  coachExplanationEn: string;
  coachExplanationFr: string;
  mihawkAnalysisFr: string;
  mihawkPros: string[];
  mihawkCons: string[];
  mihawkSynergies: string[]; // cardNumbers
  mihawkCommonUse: string;
  mihawkCommonMistake: string;
}

export const COACH_SEED: Record<string, CoachSeedEntry> = {
  "OP07-022": {
    ...expl("OP07-022"),
    mihawkPros: ["Coût faible", "Recherche Wano", "Bon en early game"],
    mihawkCons: ["Corps faible offensivement", "Peu utile en topdeck tardif"],
    mihawkSynergies: ["OP01-055", "ST32-002"],
    mihawkCommonUse: "Jouée tôt pour aller chercher une pièce Wano manquante avant de développer le reste de la main.",
    mihawkCommonMistake: "La garder trop longtemps en main au lieu de la jouer dès que possible pour profiter de sa recherche.",
  },
  "OP12-034": {
    ...expl("OP12-034"),
    mihawkPros: ["Recherche flexible", "Slash", "S'adapte à la situation"],
    mihawkCons: ["Ne développe pas de corps immédiat sur le board"],
    mihawkSynergies: ["OP12-037", "OP13-040"],
    mihawkCommonUse: "Utilisée pour aller chercher l'Event le plus pertinent selon le matchup en cours.",
    mihawkCommonMistake: "Prendre systématiquement la carte la plus chère trouvée plutôt que celle dont tu as vraiment besoin dans 1-2 tours.",
  },
  "OP14-023": {
    ...expl("OP14-023"),
    mihawkPros: ["Cible parfaite pour l'effet Leader", "Revient active gratuitement", "Counter +2000"],
    mihawkCons: ["Faible seule sans combo autour"],
    mihawkSynergies: ["OP01-055"],
    mihawkCommonUse: "Reposée volontairement pour activer l'effet Leader de Mihawk, puis redevient active en fin de tour sans coût réel.",
    mihawkCommonMistake: "Oublier qu'elle redevient active en End Phase et hésiter à la reposer par réflexe défensif.",
  },
  "ST32-001": {
    ...expl("ST32-001"),
    mihawkPros: ["Filtre la main", "Améliore la régularité", "Coût faible"],
    mihawkCons: ["N'apporte pas de puissance directe au board"],
    mihawkSynergies: ["OP01-055"],
    mihawkCommonUse: "Jouée pour transformer une carte trop chère à jouer maintenant en carte plus immédiatement utile.",
    mihawkCommonMistake: "L'utiliser sur une carte qui aurait été jouable ce tour-ci plutôt que sur une vraie carte morte.",
  },
  "ST32-005": {
    ...expl("ST32-005"),
    mihawkPros: ["Counter fiable", "Bonus +1000 passif vs leaders Slash", "Bonne défense early"],
    mihawkCons: ["Rôle surtout défensif, peu de valeur ajoutée"],
    mihawkSynergies: [],
    mihawkCommonUse: "Gardée en main comme Counter fiable ou jouée en early game pour stabiliser le board.",
    mihawkCommonMistake: "La jouer offensivement sans réel besoin plutôt que de la garder pour son Counter.",
  },
  "OP10-030": {
    ...expl("OP10-030"),
    mihawkPros: ["Bon second corps via ST32 Mihawk", "Pression offensive via Banish", "Récupère du DON!!"],
    mihawkCons: ["Aucun Counter", "Augmente le risque de main lourde en multiple exemplaires"],
    mihawkSynergies: ["ST32-003"],
    mihawkCommonUse: "Développée comme second corps gratuit via ST32 Mihawk pour maximiser la pression en un seul tour.",
    mihawkCommonMistake: "Garder 3-4 exemplaires en main simultanément sans Counter pour les accompagner — source classique de main lourde.",
  },
  "OP14-033": {
    ...expl("OP14-033"),
    mihawkPros: ["Coût 5 = active Mihawk", "Neutralise le board adverse", "Bonne carte de contrôle"],
    mihawkCons: ["Effet temporaire, pas un retrait définitif"],
    mihawkSynergies: ["ST32-003"],
    mihawkCommonUse: "Jouée pour ralentir le développement adverse pendant que tu stabilises ton propre board.",
    mihawkCommonMistake: "L'utiliser sur une cible peu dangereuse plutôt que sur la menace la plus importante du tour suivant.",
  },
  "ST32-002": {
    ...expl("ST32-002"),
    mihawkPros: ["Coût 5 = active Mihawk", "Slash", "Wano", "Pioche", "Counter +1000", "Jouable via ST32 Mihawk"],
    mihawkCons: ["Aucun inconvénient notable — considérée comme un incontournable"],
    mihawkSynergies: ["ST32-003"],
    mihawkCommonUse: "Jouée dès que possible : elle coche presque toutes les cases utiles au deck en une seule carte.",
    mihawkCommonMistake: "La garder en Counter plutôt que de la développer sur le board si tu as d'autres options défensives.",
  },
  "OP13-031": {
    ...expl("OP13-031"),
    mihawkPros: ["Recycle un Searcher déjà utilisé", "Génère de la valeur en fin de partie"],
    mihawkCons: ["Peu impactant en tout début de partie avant d'avoir des Searchers en défausse"],
    mihawkSynergies: ["OP07-022", "OP12-034", "ST32-001"],
    mihawkCommonUse: "Jouée en milieu/fin de partie pour redonner de la valeur à un Searcher déjà consommé plus tôt.",
    mihawkCommonMistake: "La jouer trop tôt avant d'avoir un vrai Searcher à récupérer en défausse.",
  },
  "ST32-003": {
    ...expl("ST32-003"),
    mihawkPros: ["Développe 2 corps en une séquence", "Filtre la main quand reposée", "Carte centrale du deck"],
    mihawkCons: ["Perd de la valeur si aucune cible à coût faible en main"],
    mihawkSynergies: ["ST32-002", "OP14-033", "OP10-030"],
    mihawkCommonUse: "Jouée pour développer immédiatement un second personnage compatible depuis la main, généralement Oden, Perona ou Smoker.",
    mihawkCommonMistake: "La jouer sans avoir de bonne cible à coût faible en main, gâchant son potentiel de double développement.",
  },
  "OP14-119": {
    ...expl("OP14-119"),
    mihawkPros: ["Puissance très élevée", "Difficile à retirer", "Bon mur défensif"],
    mihawkCons: ["Aucun Counter", "Coût élevé", "Risque de main lourde en multiple exemplaires"],
    mihawkSynergies: [],
    mihawkCommonUse: "Développée en fin de partie comme finisher ou mur défensif difficile à surmonter.",
    mihawkCommonMistake: "Garder les deux exemplaires en main simultanément avec d'autres cartes sans Counter — source de main injouable.",
  },
  "ST24-004": {
    ...expl("ST24-004"),
    mihawkPros: ["Excellent finisher", "Protège le Leader", "Puissance très élevée"],
    mihawkCons: ["Coût élevé", "Lent contre un rythme très agressif"],
    mihawkSynergies: [],
    mihawkCommonUse: "Développée en fin de partie pour sécuriser la victoire ou rendre le Leader très difficile à attaquer.",
    mihawkCommonMistake: "La prioriser trop tôt dans la partie au détriment du développement early game.",
  },
  "OP01-055": {
    ...expl("OP01-055"),
    mihawkPros: ["Pioche 2 cartes", "Recycle des Characters déjà utilisés", "Excellent avec Kikunojo"],
    mihawkCons: ["Nécessite d'avoir déjà des cibles épuisées sur le board"],
    mihawkSynergies: ["OP14-023", "OP07-022", "OP12-034", "ST32-001"],
    mihawkCommonUse: "Jouée en milieu de partie une fois que plusieurs Searchers ont déjà utilisé leur effet d'arrivée.",
    mihawkCommonMistake: "L'utiliser trop tôt avant d'avoir assez de cibles épuisées sur le board pour justifier son coût.",
  },
  "OP12-037": {
    ...expl("OP12-037"),
    mihawkPros: ["Contrôle 2 cibles adverses", "DON!! quasi récupéré via l'effet Leader", "Tempo fort"],
    mihawkCons: ["Nécessite du DON!! disponible pour être joué"],
    mihawkSynergies: ["OP14-020"],
    mihawkCommonUse: "Jouée pour neutraliser deux menaces adverses puis récupérer le DON!! dépensé via l'effet Leader le même tour.",
    mihawkCommonMistake: "Le jouer sans avoir le DON!! disponible pour activer l'effet Leader juste après, perdant l'essentiel du combo.",
  },
  "OP13-040": {
    ...expl("OP13-040"),
    mihawkPros: ["Verrouille 2 personnages adverses", "DON!! récupérable via l'effet Leader", "Counter +3000"],
    mihawkCons: ["Nécessite du DON!! disponible pour être joué"],
    mihawkSynergies: ["OP14-020"],
    mihawkCommonUse: "Jouée pour geler les menaces adverses les plus importantes du tour suivant, puis récupérer le DON!! dépensé.",
    mihawkCommonMistake: "Geler une cible peu dangereuse plutôt que la vraie menace du tour suivant.",
  },
  "OP14-039": {
    ...expl("OP14-039"),
    mihawkPros: ["Pioche à l'arrivée", "Rafraîchit du DON!! en fin de tour", "Valeur sur la durée"],
    mihawkCons: ["Trop lente contre un rythme agressif", "N'impacte pas le board immédiatement"],
    mihawkSynergies: [],
    mihawkCommonUse: "Jouée dans les matchups longs pour accumuler un avantage de ressources sur la durée.",
    mihawkCommonMistake: "La jouer contre un deck très agressif où sa lenteur ne laisse pas le temps d'en tirer profit.",
  },
};
