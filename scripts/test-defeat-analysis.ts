import {
  analyzeDefeat,
  computeTrainingPriority,
  computeMistakeTrend,
  computeSkillScores,
  MISTAKE_CATEGORIES,
  ALL_MISTAKE_TAGS,
  CLASSIFICATIONS,
  TECHNICAL_TERMS,
  TRAINING_PRIORITIES,
  SKILL_SCORE_CLASSIFICATIONS,
  type DefeatAnalysisInput,
} from "../src/lib/defeatAnalysis";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("ok  :", msg);
  }
}

// --- 1. Taxonomy sanity ---
assert(ALL_MISTAKE_TAGS.length === 71, `taxonomy has 71 tags (got ${ALL_MISTAKE_TAGS.length})`);
assert(new Set(ALL_MISTAKE_TAGS).size === ALL_MISTAKE_TAGS.length, "no duplicate tags across categories");
assert(MISTAKE_CATEGORIES.length === 7, "7 mistake categories");

// --- 2. Example from the spec (section 9) ---
const example: DefeatAnalysisInput = {
  opponentLeader: "Rocks D. Xebec",
  myDeck: "Mihawk OP14-020",
  turnOrder: "Premier",
  mulligan: false,
  openingHandQuality: "Correcte",
  keyTurn: "Tour 5",
  decisiveMoment: "Board Xebec devenu plus fort que le mien",
  boardStateAtCritical: null,
  myLifeRemaining: null,
  opponentLifeRemaining: null,
  cardsInHandEnd: null,
  donRecoveredUnused: null,
  gameDurationMinutes: null,
  lossReason: "J'ai attaqué la Life trop tôt et il a récupéré beaucoup de cartes. Ensuite, je n'arrivais plus à gérer son board.",
  whatCouldHaveDoneDifferently: null,
  tags: ["Trop de cartes données à l'adversaire en attaquant sa Life", "Mauvaise stratégie de life starvation"],
};

const result = analyzeDefeat(example);
assert(result.classification === "Life management", `example classifies as Life management (got ${result.classification})`);
assert(result.technicalTerm === "life_starvation", `example picks life_starvation term (got ${result.technicalTerm})`);
assert(result.mainCause.includes("Rocks D. Xebec"), "cause references opponent leader");
assert(result.confidenceLevel === "Moyen" || result.confidenceLevel === "Élevé", `confidence is Moyen/Élevé for a 2-tag+2-field case (got ${result.confidenceLevel})`);
assert(result.criticalMoment.includes("Tour 5"), "critical moment includes keyTurn verbatim");
assert(!result.mainCause.includes("undefined"), "no 'undefined' leaked into cause text");
assert(!result.bestLine.includes("undefined"), "no 'undefined' leaked into bestLine text");
console.log(JSON.stringify(result, null, 2));

// --- 3. Zero-info case: must fall back to "Informations insuffisantes", never fabricate ---
const empty: DefeatAnalysisInput = {
  opponentLeader: "Enel",
  myDeck: "Shanks OP17",
  turnOrder: null,
  mulligan: null,
  openingHandQuality: null,
  keyTurn: null,
  decisiveMoment: null,
  boardStateAtCritical: null,
  myLifeRemaining: null,
  opponentLifeRemaining: null,
  cardsInHandEnd: null,
  donRecoveredUnused: null,
  gameDurationMinutes: null,
  lossReason: null,
  whatCouldHaveDoneDifferently: null,
  tags: [],
};
const emptyResult = analyzeDefeat(empty);
assert(emptyResult.classification === "Informations insuffisantes", "empty input -> Informations insuffisantes");
assert(emptyResult.confidenceLevel === "Faible", "empty input -> confiance Faible");
assert(emptyResult.bestLineIsHypothesis === true, "empty input -> bestLine flagged as hypothesis");
assert(emptyResult.missingInfoQuestions.length >= 1 && emptyResult.missingInfoQuestions.length <= 3, "1-3 missing info questions for empty input");
assert(emptyResult.fundamentalsFlagged.length === 0, "no fundamentals flagged without any supporting tag");

// --- 4. Unknown tag doesn't crash, doesn't get classified ---
const withUnknown: DefeatAnalysisInput = { ...empty, tags: ["Une carte totalement inventée qui n'existe dans aucune liste"] };
const unknownResult = analyzeDefeat(withUnknown);
assert(unknownResult.classification === "Informations insuffisantes", "unrecognized tag is ignored, not fabricated into a classification");

// --- 5. Fundamentals flagged only when supported ---
const withFundamental: DefeatAnalysisInput = { ...empty, tags: ["Overcounter"] };
const fundResult = analyzeDefeat(withFundamental);
assert(fundResult.fundamentalsFlagged.some((f) => f.id === "overcounter"), "Overcounter tag flags the overcounter fundamental");
assert(fundResult.fundamentalsFlagged.length === 1, "only the supported fundamental is flagged, not all six");
assert(fundResult.classification === "Counter management", "Overcounter tag classifies as Counter management");
assert(fundResult.technicalTerm === "overcounter", "Overcounter tag term-overrides to 'overcounter'");

// --- 6. Every tag in the taxonomy maps to a real classification (no silent gaps) ---
// Exception: "Manque d'informations" legitimately maps TO "Informations
// insuffisantes" — that's its correct classification, not a gap.
for (const tag of ALL_MISTAKE_TAGS) {
  const r = analyzeDefeat({ ...empty, tags: [tag] });
  const expectedInsufficient = tag === "Manque d'informations";
  assert(
    CLASSIFICATIONS.includes(r.classification) && (expectedInsufficient || r.classification !== "Informations insuffisantes"),
    `tag "${tag}" maps to a real classification (got ${r.classification})`
  );
}

// --- 7. Training priority: needs minimum sample, never invents a priority early ---
const fewDefeats = [
  { id: "1", date: "2026-08-01", tags: ["Overcounter"] },
  { id: "2", date: "2026-08-02", tags: ["Overcounter"] },
];
const prioNoData = computeTrainingPriority(fewDefeats);
assert(prioNoData.hasData === false, "training priority needs >= 3 matches on the same tag");

const enoughDefeats = [
  { id: "1", date: "2026-08-05", tags: ["Overcounter"] },
  { id: "2", date: "2026-08-04", tags: ["Overcounter", "Mauvais mulligan"] },
  { id: "3", date: "2026-08-03", tags: ["Overcounter"] },
  { id: "4", date: "2026-08-02", tags: ["Curve non respectée"] },
];
const prioData = computeTrainingPriority(enoughDefeats);
assert(prioData.hasData === true, "training priority fires with 3 matches sharing a tag");
assert(prioData.priority === "Éviter l'overcounter", `priority picks the most frequent bucket (got ${prioData.priority})`);
assert(prioData.matchCount === 3, `matchCount counts distinct matches, not tag occurrences (got ${prioData.matchCount})`);

// --- 8. Mistake trend: needs minimum sample ---
const trendNoData = computeMistakeTrend([{ id: "1", date: "2026-08-01", tags: ["Overcounter"] }]);
assert(trendNoData.hasData === false, "mistake trend needs >= 6 tagged defeats");

const manyDefeats = Array.from({ length: 10 }, (_, i) => ({
  id: String(i),
  date: `2026-08-${String(20 - i).padStart(2, "0")}`,
  tags: i < 5 ? ["Overcounter"] : ["Mauvais mulligan"],
}));
const trendData = computeMistakeTrend(manyDefeats);
assert(trendData.hasData === true, "mistake trend fires with enough sample");
assert(trendData.entries.some((e) => e.mistake === "Overcounter" && e.direction === "up"), "Overcounter trending up in recent half");

// --- 9. Technical terms all have non-empty definitions ---
for (const key of Object.keys(TECHNICAL_TERMS) as (keyof typeof TECHNICAL_TERMS)[]) {
  assert(TECHNICAL_TERMS[key].definitionFr.length > 20, `technical term "${key}" has a real definition`);
}

// --- 9bis. Skill scores (section 14) ---
{
  const fewDocumented = [
    { id: "1", date: "2026-08-05", classification: "Sequencing" as const, classificationSecondary: [] },
    { id: "2", date: "2026-08-04", classification: "Sequencing" as const, classificationSecondary: [] },
  ];
  const noData = computeSkillScores(fewDocumented);
  assert(noData.hasData === false, "skill scores need >= 5 documented defeats");

  // 6 défaites : 3 récentes taguées "Sequencing", 3 précédentes non taguées Sequencing.
  const documented = [
    { id: "1", date: "2026-08-10", classification: "Sequencing" as const, classificationSecondary: [] },
    { id: "2", date: "2026-08-09", classification: "Sequencing" as const, classificationSecondary: [] },
    { id: "3", date: "2026-08-08", classification: "Sequencing" as const, classificationSecondary: [] },
    { id: "4", date: "2026-08-07", classification: "Tempo" as const, classificationSecondary: [] },
    { id: "5", date: "2026-08-06", classification: "Tempo" as const, classificationSecondary: [] },
    { id: "6", date: "2026-08-05", classification: "Curve" as const, classificationSecondary: [] },
  ];
  const scores = computeSkillScores(documented);
  assert(scores.hasData === true, "skill scores fire at >= 5 documented defeats");
  assert(scores.entries?.length === SKILL_SCORE_CLASSIFICATIONS.length, "one entry per skill score classification");
  const sequencing = scores.entries?.find((e) => e.skill === "Sequencing");
  assert(sequencing?.status === "priorité actuelle", `most frequent recent skill flagged as priorité actuelle (got ${sequencing?.status})`);
  const boardControl = scores.entries?.find((e) => e.skill === "Board control");
  assert(boardControl?.status === "stable", `untouched skill defaults to stable, never fabricated as declining (got ${boardControl?.status})`);
}

// --- 10. Training priority mission text exists for every priority ---
// 12 depuis la section 10 (10 priorités d'origine + "Gérer le crackback"
// + "Choisir correctement entre attaquer la Life et le board").
assert(TRAINING_PRIORITIES.length === 12, "12 training priorities defined");

if (process.exitCode) {
  console.error("\nSOME TESTS FAILED");
  process.exit(1);
} else {
  console.log("\nALL TESTS PASSED");
}
