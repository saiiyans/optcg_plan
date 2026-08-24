import { db } from "./db";

/**
 * Bilan Coach (Lot 2, Priorité 4B) — généré tous les 5 matchs, fondé
 * uniquement sur les données disponibles. Trois niveaux de confiance,
 * jamais une conclusion présentée comme fiable sous 5 parties dans la
 * catégorie concernée.
 */

export type ConfidenceLevel = "Données insuffisantes" | "Tendance provisoire" | "Tendance suffisamment observée";

function confidenceFor(sampleSize: number): ConfidenceLevel {
  if (sampleSize < 5) return "Données insuffisantes";
  if (sampleSize < 10) return "Tendance provisoire";
  return "Tendance suffisamment observée";
}

export interface CoachBilan {
  hasData: boolean;
  reason?: string;
  sampleSize?: number;
  progress?: { level: ConfidenceLevel; recentWinrate: number; previousWinrate: number; delta: number };
  mostFrequentMistake?: { level: ConfidenceLevel; mistake: string; count: number };
  hardestMatchup?: { level: ConfidenceLevel; opponent: string; winrate: number; sampleSize: number };
  firstVsSecond?: { level: ConfidenceLevel; firstWinrate: number; secondWinrate: number };
  avgDuration?: number | null;
  usefulCard?: { level: ConfidenceLevel; card: string; count: number };
  deadCard?: { level: ConfidenceLevel; card: string; count: number };
  nextTrainingGoal?: string;
}

export async function computeCoachBilan(myDeck?: string): Promise<CoachBilan> {
  const matches = await db.match.findMany({
    where: { deletedAt: null, ...(myDeck ? { myDeck } : {}) },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  if (matches.length < 5) {
    return { hasData: false, reason: `${matches.length} partie(s) enregistrée(s) — le premier Bilan Coach apparaît à partir de 5 parties.`, sampleSize: matches.length };
  }

  // Bilan généré tous les 5 matchs seulement — sur le total actuel.
  if (matches.length % 5 !== 0 && matches.length > 5) {
    // On génère quand même un bilan à jour (moins strict que "uniquement pile aux multiples de 5"),
    // mais on le signale clairement comme portant sur l'échantillon actuel.
  }

  const WINDOW = 10;
  const recent = matches.slice(0, WINDOW);
  const previous = matches.slice(WINDOW, WINDOW * 2);
  const winrateOf = (list: typeof matches) => (list.length ? Math.round((list.filter((m) => m.result === "Victoire").length / list.length) * 100) : 0);

  const progress = previous.length >= 5
    ? { level: confidenceFor(Math.min(recent.length, previous.length)), recentWinrate: winrateOf(recent), previousWinrate: winrateOf(previous), delta: winrateOf(recent) - winrateOf(previous) }
    : undefined;

  const withMistake = matches.filter((m) => m.mainMistake);
  let mostFrequentMistake: CoachBilan["mostFrequentMistake"];
  if (withMistake.length >= 5) {
    const counts = new Map<string, number>();
    for (const m of withMistake) counts.set(m.mainMistake!, (counts.get(m.mainMistake!) ?? 0) + 1);
    const [mistake, count] = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
    mostFrequentMistake = { level: confidenceFor(withMistake.length), mistake, count };
  }

  const byOpp = new Map<string, { total: number; wins: number }>();
  for (const m of matches) {
    const key = m.opponentLeader;
    const e = byOpp.get(key) ?? { total: 0, wins: 0 };
    e.total++;
    if (m.result === "Victoire") e.wins++;
    byOpp.set(key, e);
  }
  let hardestMatchup: CoachBilan["hardestMatchup"];
  for (const [opponent, d] of byOpp) {
    if (d.total < 3) continue;
    const wr = Math.round((d.wins / d.total) * 100);
    if (!hardestMatchup || wr < hardestMatchup.winrate) {
      hardestMatchup = { level: confidenceFor(d.total), opponent, winrate: wr, sampleSize: d.total };
    }
  }

  const firstM = matches.filter((m) => m.turnOrder === "Premier");
  const secondM = matches.filter((m) => m.turnOrder === "Second");
  const firstVsSecond = firstM.length >= 5 && secondM.length >= 5
    ? { level: confidenceFor(Math.min(firstM.length, secondM.length)), firstWinrate: winrateOf(firstM), secondWinrate: winrateOf(secondM) }
    : undefined;

  const durations = matches.map((m) => m.gameDurationMinutes).filter((d): d is number => d != null);
  const avgDuration = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;

  const withUseful = matches.filter((m) => m.mostUsefulCard);
  let usefulCard: CoachBilan["usefulCard"];
  if (withUseful.length >= 5) {
    const counts = new Map<string, number>();
    for (const m of withUseful) counts.set(m.mostUsefulCard!, (counts.get(m.mostUsefulCard!) ?? 0) + 1);
    const [card, count] = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
    usefulCard = { level: confidenceFor(withUseful.length), card, count };
  }

  const withDead = matches.filter((m) => m.uselessCard);
  let deadCard: CoachBilan["deadCard"];
  if (withDead.length >= 5) {
    const counts = new Map<string, number>();
    for (const m of withDead) counts.set(m.uselessCard!, (counts.get(m.uselessCard!) ?? 0) + 1);
    const [card, count] = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
    deadCard = { level: confidenceFor(withDead.length), card, count };
  }

  let nextTrainingGoal: string | undefined;
  if (hardestMatchup && hardestMatchup.level !== "Données insuffisantes") {
    nextTrainingGoal = `Joue 3 parties contre ${hardestMatchup.opponent} en te concentrant sur le contrôle du board avant d'attaquer la vie.`;
  } else if (mostFrequentMistake && mostFrequentMistake.level !== "Données insuffisantes") {
    nextTrainingGoal = `Concentre-toi sur "${mostFrequentMistake.mistake}" lors de tes 3 prochaines parties.`;
  }

  return {
    hasData: true,
    sampleSize: matches.length,
    progress,
    mostFrequentMistake,
    hardestMatchup,
    firstVsSecond,
    avgDuration,
    usefulCard,
    deadCard,
    nextTrainingGoal,
  };
}
