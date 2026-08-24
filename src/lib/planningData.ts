export interface PlanningWeek {
  n: number;
  range: string;
  startDate: string; // ISO (yyyy-mm-dd) — utilisé pour calculer l'objectif du jour sur la page d'accueil
  focus: string;
  sim: number;
  bout: number;
  milestone: string;
  warn?: boolean;
}

export const TOURNAMENT_DATE = "2026-09-20T00:00:00";

export const WEEKS: PlanningWeek[] = [
  {
    n: 1,
    range: "3 – 9 août",
    startDate: "2026-08-03",
    focus:
      "Reprise après une pause : revoir les règles de base (Life, Trigger, Blocker, DON!!, Counter, restand) avant d'enchaîner les parties. Puis Mihawk : automatismes, mulligan, timing de l'effet leader. Le format actuel est OP16 'The Time of Battle' — la méta a beaucoup bougé depuis OP14.",
    sim: 12,
    bout: 4,
    milestone: "Objectif : règles de base à l'aise + savoir expliquer le plan de jeu de Mihawk à voix haute.",
  },
  {
    n: 2,
    range: "10 – 16 août",
    startDate: "2026-08-10",
    focus:
      "Mihawk contre les leaders actuels de la méta OP16 (Enel, Luffy, Teach, Yamato...). Début du suivi de stats par adversaire — note systématiquement le leader adverse à chaque partie.",
    sim: 12,
    bout: 4,
    milestone: "Objectif : identifier tes 2 pires matchups actuels.",
  },
  {
    n: 3,
    range: "17 – 23 août",
    startDate: "2026-08-17",
    focus: "Sortie d'OP17 le 22/08 (JP) / 28/08 (EN large). Dès que possible, premiers tests de Shanks en parallèle de Mihawk.",
    sim: 12,
    bout: 4,
    milestone: "Jalon : premières parties avec Shanks jouées.",
    warn: true,
  },
  {
    n: 4,
    range: "24 – 30 août",
    startDate: "2026-08-24",
    focus: "Construction et rodage Shanks : automatismes, courbe de jeu, cartes clés Red-Haired Pirates. Comparatif direct avec Mihawk.",
    sim: 12,
    bout: 6,
    milestone: "Objectif : deck Shanks stabilisé (liste quasi figée).",
  },
  {
    n: 5,
    range: "31 août – 6 sept",
    startDate: "2026-08-31",
    focus: "Affinage des deux decks. Les statistiques doivent commencer à orienter le choix du deck de tournoi.",
    sim: 12,
    bout: 6,
    milestone: "Objectif : tendance claire sur le deck à privilégier.",
  },
  {
    n: 6,
    range: "7 – 13 sept",
    startDate: "2026-09-07",
    focus: "Deck quasi figé. Sparring intensif ciblé sur les matchups les plus difficiles identifiés dans les statistiques.",
    sim: 12,
    bout: 8,
    milestone: "Objectif : winrate en progression sur les matchups à risque.",
  },
  {
    n: 7,
    range: "14 – 20 sept",
    startDate: "2026-09-14",
    focus: "Dernière ligne droite : répétitions, révision mentale du plan de jeu, pas de changement de deck de dernière minute. Repos avant le tournoi.",
    sim: 6,
    bout: 4,
    milestone: "20 septembre : jour du tournoi.",
    warn: true,
  },
];

export interface DefaultObjective {
  category: "meta" | "cartes" | "strat" | "matchups";
  text: string;
  order: number;
}

export const DEFAULT_OBJECTIVES: DefaultObjective[] = [
  // Méta
  { category: "meta", order: 1, text: "Format actuel : OP16 'The Time of Battle'. Connaître le plan de jeu des top decks : Enel (OP15-058, combo DON limité, meilleur deck actuel), Luffy Vert/Bleu (OP16-022, agressif), Marshall D. Teach (OP16-080/119, Black/Yellow), Yamato (OP16-079/096, boucle Rush)" },
  { category: "meta", order: 2, text: "Connaître les decks de tier A : Nami (OP11-041, valeur/contrôle), Rosinante (protection), Sengoku (Purple, valeur Marine), Imu (contrôle pur, plus lent face à la vitesse actuelle)" },
  { category: "meta", order: 3, text: "Noter que Mihawk (OP14-020) et Boa Hancock (OP14-041) ont reculé dans la méta OP16 par rapport à leur période dominante en OP14 — à intégrer dans le choix final de deck" },
  { category: "meta", order: 4, text: "Suivre les résultats de tournois récents (Limitless TCG, onepiece.gg, onepiecetopdecks.com)" },
  { category: "meta", order: 5, text: "Repérer les nouveaux leaders OP17 dès leur sortie le 22 août (Newgate Rouge, Luffy Noir, Kaido Violet, Big Mom Jaune, Xebec Bleu, Shanks Vert) — la méta va évoluer entre le 22 août et le tournoi" },
  { category: "meta", order: 6, text: "Trancher sur le deck final pour le 20 septembre à partir des statistiques" },
  { category: "meta", order: 7, text: "Vérifier la légalité Standard/Extra de toutes mes cartes avant le tournoi" },
  // Cartes
  { category: "cartes", order: 1, text: "Mihawk OP14-020 — effet leader : reposer 1 carte pour activer 3 DON si un perso coût 5+ est en jeu (plus de perso jouable ce tour ensuite)" },
  { category: "cartes", order: 2, text: "Perona OP12-034 / OP14-033 — chercheuse universelle et stabilisation du board" },
  { category: "cartes", order: 3, text: "Tashigi OP14-029 — attaquant milieu de partie difficile à retirer" },
  { category: "cartes", order: 4, text: "Coffin Boat OP14-039 — non affecté par le repos du leader, à jouer tôt" },
  { category: "cartes", order: 5, text: "Shanks OP14-027 et Mihawk OP14-119 — finisseurs de fin de partie" },
  { category: "cartes", order: 6, text: "Shanks OP17 — effet leader : défausser 1 carte ou reposer 1 DON pour empêcher un perso adverse reposé de se réactiver" },
  { category: "cartes", order: 7, text: "Suivre les cartes Red-Haired Pirates révélées après le 22 août pour compléter la liste Shanks" },
  // Stratégies
  { category: "strat", order: 1, text: "Mihawk gagne +1000 de puissance contre les leaders de type Tranchant (Slash) — jouer plus agressif dans ce match" },
  { category: "strat", order: 2, text: "Ne plus pouvoir jouer de personnage après avoir activé l'effet leader Mihawk — bien timer son utilisation" },
  { category: "strat", order: 3, text: "Matchups historiquement difficiles contre les piliers OP13 : Imu et Portgas D. Ace" },
  { category: "strat", order: 4, text: "Anticiper les nouvelles cartes de retrait (removal) apportées par OP17" },
  { category: "strat", order: 5, text: "Gérer le tempo face aux decks qui accélèrent la génération de DON!!" },
  { category: "strat", order: 6, text: "[Conseil communautaire] Mulligan Mihawk — premier : garder Coffin Boat + Perona 1 coût + idéalement Tashigi/Shanks/Law. Second : même base + Perona 5 coût ou Tashigi + Law 6 coût" },
  { category: "strat", order: 7, text: "[Conseil communautaire] Séquencer Shanks (OP14-027) avant Law & Bepo (ST24-004) pour garantir le bonus +2000 du leader (Law & Bepo n'a besoin que d'1 seul perso adverse déjà reposé par Shanks)" },
  { category: "strat", order: 8, text: "[Conseil communautaire] Reconnaître le moment où l'adversaire est assez verrouillé pour ignorer le board et foncer sur son leader directement" },
  { category: "strat", order: 9, text: "[Observation isolée, à vérifier] Jinbe signalé comme le matchup le plus défavorable par un joueur compétitif (un seul avis, pas une donnée de tournoi agrégée)" },
  // Matchups
  { category: "matchups", order: 1, text: "Mihawk vs Enel (OP15-058) — meilleur deck actuel, priorité haute — viser 5 parties minimum" },
  { category: "matchups", order: 2, text: "Shanks vs Enel (OP15-058) — même priorité, dès que le deck Shanks est jouable" },
  { category: "matchups", order: 3, text: "Mihawk vs Luffy Vert/Bleu (OP16-022) — tester la stabilisation face à un deck rapide" },
  { category: "matchups", order: 4, text: "Shanks vs Luffy Vert/Bleu (OP16-022) — vérifier si le deck tient le rythme en early game" },
  { category: "matchups", order: 5, text: "Mihawk vs Marshall D. Teach (OP16-080/119) — matchup de contrôle, gérer le board wipe" },
  { category: "matchups", order: 6, text: "Shanks vs Marshall D. Teach (OP16-080/119) — même vigilance côté contrôle" },
  { category: "matchups", order: 7, text: "Mihawk vs Yamato (OP16-079/096) — anticiper la boucle Rush avant qu'elle ne s'enclenche" },
  { category: "matchups", order: 8, text: "Mihawk vs Imu (OP13-079) — matchup historiquement défavorable, à retravailler en priorité" },
  { category: "matchups", order: 9, text: "Mihawk vs Nami (OP11-041) — matchup d'attrition/valeur, tester la patience" },
  { category: "matchups", order: 10, text: "Mihawk et Shanks vs Sengoku (OP16, Purple) — deck de valeur Marine à découvrir" },
  { category: "matchups", order: 11, text: "Miroir Vert (Mihawk vs Mihawk, Shanks vs Shanks) — matchup probable en boutique locale" },
  { category: "matchups", order: 12, text: "Mihawk et Shanks vs les 6 nouveaux leaders OP17 (Newgate, Luffy Noir, Kaido, Big Mom, Xebec, miroir Shanks) dès la sortie du set le 22 août" },
];

// Liste complète des leaders OPTCG (toutes couleurs/variantes), tirée de la
// base officielle Bandai (via le dataset punk-records), à jour jusqu'à
// OP16 / ST36. Les leaders les plus fréquents dans la méta actuelle sont
// volontairement laissés en tête de liste (voir META_PRIORITY_LEADERS
// ci-dessous) pour rester visibles même une fois la liste complète ajoutée.
//
// Depuis cette mise à jour, cette liste statique n'est plus la seule
// source : /api/leaders (src/app/api/leaders/route.ts) interroge la vraie
// bibliothèque de cartes importée (catégorie "Leader") et se met à jour
// toute seule à chaque nouveau set repéré par le scraper — voir
// useOpponentLeaders() (src/lib/useOpponentLeaders.ts), qui fusionne les
// deux. Cette liste reste le repli utilisé tant que l'API n'a pas répondu
// (chargement instantané) ou si la base est temporairement inaccessible.
//
// Les 5 leaders OP17 déjà confirmés (voir src/lib/data/op17-confirmed.json,
// vérifiés carte par carte avant tout ajout) ont été ajoutés manuellement
// ci-dessous en attendant que l'import automatique les récupère. Le 6e
// leader OP17 (Bleu, bloc "Rocks Pirates", probablement Rocks D. Xebec —
// carte OP17-039) n'a PAS été ajouté : il n'est pas encore confirmé même
// dans op17-confirmed.json, donc jamais deviné ici non plus.
export const OPPONENT_LEADERS = [
  "Ace et Newgate (Bleu)", "Baggy (Bleu)", "Belo Betty (Rouge/Jaune)", "Boa Hancock (Bleu)",
  "Boa Hancock (Bleu/Jaune)", "Brook (Vert/Noir)", "Calgara (Jaune)", "Carrot (Vert)",
  "Charlotte Katakuri (Jaune)", "Charlotte Katakuri (Violet)", "Charlotte Linlin (Jaune)",
  "Charlotte Pudding (Violet/Jaune)",
  "Crocodile (Noir)", "César Clown (Rouge/Bleu)", "Don Quijote Doflamingo (Bleu)",
  "Don Quijote Doflamingo (Violet)", "Don Quijote Rosinante (Vert/Bleu)",
  "Don Quijote Rosinante (Violet/Jaune)", "Dracule Mihawk (Vert)", "Edward Newgate (Rouge)",
  "Ener (Jaune)", "Ener (Violet)", "Eustass \"Captain\" Kidd (Jaune)", "Foxy (Violet)",
  "Gecko Moria (Noir)", "Gecko Moria (Noir/Jaune)", "Gol D. Roger (Rouge/Violet)",
  "Hannyabal (Bleu/Violet)", "Hody Jones (Vert)", "Imu (Noir)", "Jewelry Bonney (Jaune)",
  "Jewelry Bonney (Rouge/Jaune)", "Jewelry Bonney (Vert)", "Jinbe (Bleu)", "Jinbe (Vert)",
  "Kaido (Violet)",
  "King (Violet/Noir)", "Koala (Noir/Jaune)", "Kobby (Rouge/Noir)", "Krieg (Rouge/Vert)",
  "Kuzan (Bleu)", "Kyros (Noir/Jaune)", "Lim (Vert/Violet)", "Lucy (Rouge/Bleu)",
  "Luffy et Ace (Rouge/Vert)", "Marco (Rouge/Bleu)", "Marshall D. Teach (Noir)",
  "Marshall D. Teach (Noir/Jaune)", "Monkey D. Dragon (Rouge)", "Monkey D. Luffy (Bleu/Violet)",
  "Monkey D. Luffy (Jaune)", "Monkey D. Luffy (Noir)", "Monkey D. Luffy (Noir/Jaune)", "Monkey D. Luffy (Rouge)",
  "Monkey D. Luffy (Rouge/Vert)", "Monkey D. Luffy (Vert/Bleu)", "Monkey D. Luffy (Vert/Violet)",
  "Monkey D. Luffy (Violet)", "Monkey D. Luffy (Violet/Noir)", "Nami (Bleu)", "Nami (Bleu/Jaune)",
  "Nefertari Vivi (Rouge/Bleu)", "Nico Robin (Violet/Jaune)", "Oden Kozuki (Rouge/Vert)",
  "Perona (Vert/Noir)", "Portgas D. Ace (Bleu/Jaune)", "Portgas D. Ace (Rouge)",
  "Portgas D. Ace (Rouge/Bleu)", "Rebecca (Bleu)", "Reiju Vinsmoke (Bleu/Violet)",
  "Rob Lucci (Noir)", "Roronoa Zoro (Vert)", "Sabo (Rouge/Jaune)", "Sabo (Rouge/Noir)",
  "Sanji (Bleu/Violet)", "Sanji (Rouge)", "Sengoku (Violet)", "Shanks (Rouge)", "Shanks (Vert)",
  "Shirahoshi (Vert/Jaune)", "Silvers Rayleigh (Rouge)", "Smoker (Noir)", "Smoker (Rouge/Vert)",
  "Sugar (Rouge/Violet)", "Tony-Tony Chopper (Rouge/Vert)", "Trafalgar Law (Rouge)",
  "Trafalgar Law (Vert/Jaune)", "Usopp (Bleu/Noir)", "Uta (Rouge/Violet)", "Uta (Vert)",
  "Végapunk (Jaune)", "Yamato (Noir)", "Yamato (Vert/Jaune)",
];

// Sous-ensemble mis en avant dans les analyses de méta (Objectifs, etc.) —
// distinct de la liste complète du menu déroulant ci-dessus.
export const META_PRIORITY_LEADERS = [
  "Enel (OP15-058)",
  "Luffy Vert/Bleu (OP16-022)",
  "Marshall D. Teach (OP16-080/119)",
  "Yamato (OP16-079/096)",
  "Nami (OP11-041)",
  "Rosinante (EB04)",
  "Sengoku (OP16)",
  "Imu (OP13-079)",
  "Boa Hancock (OP14-041)",
  "Portgas D. Ace (OP13-002)",
  "Edward Newgate (OP17)",
  "Luffy Noir (OP17)",
  "Kaido (OP17)",
  "Big Mom (OP17)",
  "Rocks D. Xebec (OP17)",
];

export const MY_DECKS = ["Mihawk OP14-020", "Shanks OP17"];
