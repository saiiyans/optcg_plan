/**
 * Liste candidate des cartes du Quiz des effets (méta OP17) — demandée le
 * 31/08/2026. RIEN ICI N'EST INVENTÉ : chaque entrée vient d'une source
 * datée et vérifiable (voir `source` sur chaque groupe ci-dessous). Cette
 * liste ne fait QUE sélectionner quelles cartes entrent dans le quiz — le
 * texte d'effet réel est TOUJOURS lu depuis Card.officialText/officialTextFr
 * (jamais dupliqué ici), et une carte dont le texte officiel n'a pas pu
 * être vérifié reste `status="incomplete"` et n'est jamais servie en jeu
 * (voir /api/admin/quiz-build).
 *
 * Comment étendre vers les 200 cartes visées : ajouter des numéros de
 * carte (réels, vérifiables) dans QUIZ_CANDIDATES ci-dessous, puis relancer
 * POST /api/import/batch (texte officiel) et /api/admin/quiz-build
 * (traduction + mauvaises réponses). Cette liste n'a pas besoin d'être
 * complète dès le départ — voir status="pending"/"incomplete" sur QuizCard.
 */

export interface QuizCandidate {
  cardNumber: string;
  kind: "leader" | "staple";
  archetypes: string[]; // leaders/decks où la carte est jouée
  sourceNote: string;
  metaScore: number; // signal réel (winrate/playrate du leader si connu, sinon 0 = non chiffré)
}

// --- Leaders (tier S et A) — source : /api/tier-list/simulator de cette
// même app, lui-même alimenté par cardkaizoku.com/ranking, filtre
// "Simulator — Standard Last Week (All Lobbies)", fichier stats du
// 2026-08-30 (95 leaders classés, échantillon de plusieurs centaines de
// milliers de parties simulées — voir cardKaizokuTierScraper.ts).
const LEADER_SOURCE = "cardkaizoku.com/ranking — Simulator, Standard Last Week (All Lobbies), stats du 2026-08-30";

const S_TIER_LEADERS: { cardNumber: string; name: string; winRate: number }[] = [
  { cardNumber: "OP13-004", name: "Sabo", winRate: 54.2 },
  { cardNumber: "OP09-062", name: "Nico Robin", winRate: 53.2 },
  { cardNumber: "OP17-099", name: "Charlotte Linlin", winRate: 52.3 },
  { cardNumber: "OP16-001", name: "Portgas.D.Ace", winRate: 52.2 },
  { cardNumber: "OP14-020", name: "Dracule Mihawk", winRate: 52.0 },
  { cardNumber: "ST30-001", name: "Luffy & Ace", winRate: 52.0 },
  { cardNumber: "OP17-079", name: "Monkey.D.Luffy", winRate: 51.2 },
  { cardNumber: "OP17-058", name: "Kaido", winRate: 51.0 },
  { cardNumber: "OP17-039", name: "Rocks.D.Xebec", winRate: 51.0 },
  { cardNumber: "OP14-041", name: "Boa Hancock", winRate: 51.0 },
  { cardNumber: "OP05-098", name: "Enel", winRate: 51.0 },
  { cardNumber: "OP14-080", name: "Gecko Moria", winRate: 51.0 },
  { cardNumber: "OP08-058", name: "Charlotte Pudding", winRate: 51.0 },
  { cardNumber: "OP17-020", name: "Shanks", winRate: 51.0 },
  { cardNumber: "OP17-001", name: "Edward.Newgate", winRate: 51.0 },
];

const A_TIER_LEADERS: string[] = [
  "OP13-100", "OP15-058", "OP16-079", "OP11-062", "ST21-001", "ST29-001", "OP13-001", "OP11-001",
  "OP16-080", "OP11-041", "EB04-001", "OP12-081", "OP05-002", "OP16-060", "ST13-001", "ST10-002",
  "OP11-040", "OP13-079", "OP16-022",
];

// --- Cartes non-Leader ("staples") — source : spellmana.com, article
// "One Piece Card Game OP17 Meta Tier List – OPTCG Best Decks" (consulté le
// 31/08/2026), qui liste les cartes clés de chaque archétype top/A-tier du
// format OP17. Les numéros de carte viennent de cet article ; le TEXTE
// D'EFFET de chacune n'est jamais pris de cet article — toujours vérifié
// séparément sur limitlesstcg.com (source déjà utilisée par toute l'app).
const STAPLE_SOURCE = "spellmana.com — \"OP17 Meta Tier List\" (consulté le 31/08/2026), recoupé avec limitlesstcg.com pour le texte officiel";

const STAPLES: { cardNumber: string; archetypes: string[] }[] = [
  { cardNumber: "OP01-016", archetypes: ["Sabo"] },
  { cardNumber: "OP17-086", archetypes: ["Sabo"] },
  { cardNumber: "ST01-011", archetypes: ["Sabo"] },
  { cardNumber: "OP17-080", archetypes: ["Sabo"] },
  { cardNumber: "OP17-087", archetypes: ["Sabo"] },
  { cardNumber: "OP17-095", archetypes: ["Sabo"] },
  { cardNumber: "OP17-089", archetypes: ["Sabo"] },
  { cardNumber: "OP17-119", archetypes: ["Sabo"] },
  { cardNumber: "OP17-093", archetypes: ["Sabo"] },
  { cardNumber: "OP07-022", archetypes: ["Mihawk"] },
  { cardNumber: "OP12-034", archetypes: ["Mihawk"] },
  { cardNumber: "ST32-001", archetypes: ["Mihawk"] },
  { cardNumber: "OP12-023", archetypes: ["Mihawk"] },
  { cardNumber: "OP14-027", archetypes: ["Mihawk"] },
  { cardNumber: "ST16-004", archetypes: ["Mihawk"] },
  { cardNumber: "OP17-050", archetypes: ["Rocks.D.Xebec"] },
  { cardNumber: "OP17-049", archetypes: ["Rocks.D.Xebec"] },
  { cardNumber: "OP17-040", archetypes: ["Rocks.D.Xebec"] },
  { cardNumber: "OP17-048", archetypes: ["Rocks.D.Xebec"] },
  { cardNumber: "EB04-032", archetypes: ["Kaido"] },
  { cardNumber: "OP08-074", archetypes: ["Kaido"] },
  { cardNumber: "EB04-031", archetypes: ["Kaido"] },
  { cardNumber: "OP17-074", archetypes: ["Kaido"] },
  { cardNumber: "OP13-016", archetypes: ["Portgas.D.Ace"] },
  { cardNumber: "OP16-014", archetypes: ["Portgas.D.Ace"] },
  { cardNumber: "OP16-003", archetypes: ["Portgas.D.Ace"] },
  { cardNumber: "OP17-005", archetypes: ["Portgas.D.Ace", "Edward.Newgate"] },
  { cardNumber: "OP15-088", archetypes: ["Monkey.D.Luffy (Black)"] },
  { cardNumber: "OP11-106", archetypes: ["Charlotte Linlin"] },
  { cardNumber: "OP17-103", archetypes: ["Charlotte Linlin"] },
  { cardNumber: "OP15-075", archetypes: ["Enel"] },
  { cardNumber: "OP15-077", archetypes: ["Enel"] },
  { cardNumber: "OP15-078", archetypes: ["Enel"] },
  { cardNumber: "ST31-005", archetypes: ["Luffy & Ace"] },
  { cardNumber: "OP17-022", archetypes: ["Shanks"] },
  { cardNumber: "OP17-033", archetypes: ["Shanks"] },
  { cardNumber: "OP17-031", archetypes: ["Shanks"] },
  { cardNumber: "OP16-084", archetypes: ["Yamato"] },
  { cardNumber: "OP16-085", archetypes: ["Yamato"] },
  { cardNumber: "OP16-087", archetypes: ["Yamato"] },
  { cardNumber: "OP13-082", archetypes: ["Imu"] },
];

function leaderMetaScore(cardNumber: string): number {
  const s = S_TIER_LEADERS.find((l) => l.cardNumber === cardNumber);
  return s ? s.winRate : 50; // A-tier sans winrate individuel retenu ici : score neutre, jamais un chiffre inventé au-delà de "classé A-tier"
}

export const QUIZ_CANDIDATES: QuizCandidate[] = [
  ...S_TIER_LEADERS.map((l) => ({
    cardNumber: l.cardNumber,
    kind: "leader" as const,
    archetypes: [l.name],
    sourceNote: `${LEADER_SOURCE} — tier S, winrate pondéré ${l.winRate}%`,
    metaScore: l.winRate,
  })),
  ...A_TIER_LEADERS.map((cardNumber) => ({
    cardNumber,
    kind: "leader" as const,
    archetypes: [] as string[], // rempli automatiquement avec le nom de la carte lors du build (voir quiz-build/route.ts)
    sourceNote: `${LEADER_SOURCE} — tier A`,
    metaScore: 50,
  })),
  ...STAPLES.map((s) => ({
    cardNumber: s.cardNumber,
    kind: "staple" as const,
    archetypes: s.archetypes,
    sourceNote: STAPLE_SOURCE,
    metaScore: leaderMetaScore(s.archetypes[0] ?? ""),
  })),
];
