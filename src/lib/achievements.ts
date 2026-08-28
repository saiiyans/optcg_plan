import { db } from "./db";
import { computeDailyProgress } from "./trainingPhase";

/**
 * Série (streak) et badges — jamais de points/XP factices, tout est
 * calculé en direct depuis les vraies données (parties, objectifs,
 * Bilan Coach). Aucune donnée stockée séparément : recalculé à chaque
 * appel, donc toujours exact, jamais désynchronisé.
 *
 * Ne considère QUE les parties en phase "official_training" — mêmes
 * règles que le reste du dashboard/coach (source unique, voir
 * src/lib/config.ts et /api/coach/daily-progress). Avant cette refonte,
 * ce fichier recalculait sa PROPRE série (toute partie confondue, fuseau
 * UTC, sans objectif quotidien) — c'était exactement la 2e source
 * d'incohérence derrière le "0/4 ici, 0/3 ailleurs" : ce module délègue
 * maintenant le calcul de série à computeDailyProgress (trainingPhase.ts,
 * fuseau Asia/Bangkok, objectif DAILY_GOAL=4/jour).
 *
 * Inspiré des bonnes pratiques 2026 (recherche menée avant implémentation) :
 * - Série avec système de grâce (voir computeDailyProgress) plutôt qu'une
 *   remise à zéro punitive — évite l'anxiété type "notification culpabilisante".
 * - Badges liés à une vraie maîtrise (winrate, tendance confirmée...),
 *   jamais au simple fait d'avoir ouvert l'app — pour rester crédible en
 *   tant que coach plutôt que de tomber dans la "pointsification".
 */

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  activeToday: boolean;
  atRisk: boolean; // objectif du jour pas encore atteint, mais série toujours active
}

async function getOfficialMatchDatesAndSettings() {
  const [matches, settings] = await Promise.all([
    db.match.findMany({ where: { trainingPhase: "official_training", deletedAt: null }, select: { date: true } }),
    db.appSettings.findUnique({ where: { id: "singleton" } }),
  ]);
  return { matchDates: matches.map((m: { date: string }) => m.date), officialTrainingStartDate: settings?.officialTrainingStartDate ?? null };
}

export async function computeStreak(): Promise<StreakInfo> {
  const { matchDates, officialTrainingStartDate } = await getOfficialMatchDatesAndSettings();
  const progress = computeDailyProgress({ matchDates, officialTrainingStartDate });

  return {
    currentStreak: progress.currentStreak,
    longestStreak: progress.bestStreak,
    activeToday: progress.goalMetToday,
    atRisk: progress.currentStreak > 0 && !progress.goalMetToday,
  };
}

export interface Achievement {
  id: string;
  label: string;
  description: string;
  unlocked: boolean;
  progress?: string; // ex. "7/10" — affiché même verrouillé, pour motiver sans frustrer
}

export async function computeAchievements(): Promise<Achievement[]> {
  // Uniquement l'entraînement officiel — un badge "Vétéran" ne doit pas se
  // débloquer instantanément à partir de l'historique "Phase test".
  const matches = await db.match.findMany({ where: { trainingPhase: "official_training", deletedAt: null } });
  const total = matches.length;
  const wins = matches.filter((m: (typeof matches)[number]) => m.result === "Victoire").length;
  const objectives = await db.objectiveItem.findMany();
  const objectivesDone = objectives.filter((o: (typeof objectives)[number]) => o.done).length;

  const byOpp = new Map<string, { total: number; wins: number }>();
  for (const m of matches) {
    const e = byOpp.get(m.opponentLeader) ?? { total: 0, wins: 0 };
    e.total++;
    if (m.result === "Victoire") e.wins++;
    byOpp.set(m.opponentLeader, e);
  }
  const hasStrongMatchup = Array.from(byOpp.values()).some((e) => e.total >= 5 && e.wins / e.total >= 0.6);

  const streak = await computeStreak();

  const list: Achievement[] = [
    {
      id: "first_match",
      label: "Premier pas",
      description: "Enregistrer ta première partie officielle.",
      unlocked: total >= 1,
    },
    {
      id: "matches_10",
      label: "Régularité",
      description: "10 parties officielles enregistrées.",
      unlocked: total >= 10,
      progress: `${Math.min(total, 10)}/10`,
    },
    {
      id: "matches_50",
      label: "Vétéran",
      description: "50 parties officielles enregistrées.",
      unlocked: total >= 50,
      progress: `${Math.min(total, 50)}/50`,
    },
    {
      id: "winrate_50",
      label: "Équilibre trouvé",
      description: "Atteindre 50% de winrate officiel sur au moins 10 parties.",
      unlocked: total >= 10 && wins / total >= 0.5,
    },
    {
      id: "matchup_mastered",
      label: "Matchup maîtrisé",
      description: "60%+ de winrate sur un matchup, avec au moins 5 parties jouées contre lui.",
      unlocked: hasStrongMatchup,
    },
    {
      id: "objective_done",
      label: "Premier objectif",
      description: "Cocher ton premier objectif d'entraînement.",
      unlocked: objectivesDone >= 1,
    },
    {
      id: "streak_7",
      label: "Semaine complète",
      description: "7 jours d'affilée avec l'objectif quotidien (4 parties) atteint.",
      unlocked: streak.longestStreak >= 7,
      progress: `${Math.min(streak.longestStreak, 7)}/7`,
    },
  ];

  return list;
}
