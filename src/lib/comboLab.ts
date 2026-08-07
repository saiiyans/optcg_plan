export interface Combo {
  slug: string;
  title: string;
  steps: string[]; // séquence, affichée avec des flèches
  rating?: number; // /5, optionnel
  badge?: string;
  cards: string[]; // cardNumbers impliqués, pour les liens
  note?: string;
}

export const COMBOS: Combo[] = [
  {
    slug: "kikunojo-loop",
    title: "Kikunojo Loop",
    steps: ["Kikunojo sur le board", "Reposée pour activer l'effet Leader Mihawk", "+3 DON!! récupérés", "End Phase", "Kikunojo redevient active"],
    rating: 5,
    cards: ["OP14-023"],
    note: "Kikunojo revient active toute seule en fin de tour, donc la reposer pour l'effet Leader ne coûte quasiment rien.",
  },
  {
    slug: "samurai-engine",
    title: "Samurai Engine",
    steps: ["Un Searcher a déjà utilisé son effet d'arrivée", "You Can Be My Samurai!! reposé", "2 cartes piochées", "Si Kikunojo fait partie du lot : elle redevient active en End Phase"],
    cards: ["OP01-055", "OP14-023", "OP07-022", "OP12-034", "ST32-001"],
    note: "Particulièrement fort avec Kikunojo, puisqu'elle ne reste jamais reposée pour de bon.",
  },
  {
    slug: "st32-mihawk-oden",
    title: "ST32 Mihawk → Oden",
    steps: ["6 DON!! disponibles", "Mihawk 7000 en jeu", "Oden développé gratuitement (6000)", "Pioche + effet de contrôle d'Oden"],
    badge: "🔥 Tempo massif",
    cards: ["ST32-003", "ST32-002"],
    note: "Deux corps développés et un effet de pioche/contrôle pour une seule séquence de jeu.",
  },
  {
    slug: "st32-mihawk-smoker",
    title: "ST32 Mihawk → Smoker",
    steps: ["6 DON!! disponibles", "Mihawk 7000 en jeu", "Smoker développé gratuitement (7000, Banish)"],
    badge: "14 000 de puissance pour 6 DON!!",
    cards: ["ST32-003", "OP10-030"],
    note: "Board très large développé d'un coup, avec la pression supplémentaire de Banish sur Smoker.",
  },
  {
    slug: "don-loop-op12-037",
    title: "Event DON Loop",
    steps: ["OP12-037 joué (repose du DON!!)", "2 cibles adverses contrôlées", "Effet Leader Mihawk activé", "DON!! récupéré"],
    badge: "🔥 DON Loop",
    cards: ["OP12-037"],
    note: "Le DON!! dépensé pour contrôler l'adversaire est presque intégralement récupéré le même tour.",
  },
  {
    slug: "freeze-loop-op13-040",
    title: "Freeze Loop",
    steps: ["OP13-040 joué (repose du DON!!)", "Jusqu'à 2 Characters adverses gelés", "Effet Leader Mihawk activé", "DON!! récupéré"],
    cards: ["OP13-040"],
    note: "Même logique que le DON Loop, mais orienté verrouillage plutôt que retrait.",
  },
  {
    slug: "law-recycling",
    title: "Law Recycling",
    steps: ["Un Searcher déjà utilisé part en défausse", "Law joué", "Le Searcher revient en main", "Un nouveau Character ≤5 est développé", "Le Searcher pourra être rejoué plus tard"],
    badge: "♻️ Value Engine",
    cards: ["OP13-031"],
    note: "Transforme une carte déjà utilisée en ressource réutilisable — très fort en milieu/fin de partie.",
  },
];
