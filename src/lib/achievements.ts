import { db } from "./db";

/**
 * Série (streak) et badges — jamais de points/XP factices, tout est
 * calculé en direct depuis les vraies données (parties, objectifs,
 * Bilan Coach). Aucune donnée stockée séparément : recalculé à chaque
 * appel, donc toujours exact, jamais désynchronisé.
 *
 * Inspiré des bonnes pratiques 2026 (recherche menée avant implémentation) :
 * - Série avec système de grâce (1 jour de battement toléré) plutôt qu'une
 *   remise à zéro punitive — évite l'anxiété type "notification culpabilisante".
 * - Badges liés à une vraie maîtrise (winrate, tendance confirmée...),
 *   jamais au simple fait d'avoir ouvert l'app — pour rester crédible en
 *   tant que coach plutôt que de tomber dans la "pointsification".
 */

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  activeToday: boolean;
  atRisk: boolean; // pas encore joué aujourd'hui, mais série toujours active
}

export async function computeStreak(): Promise<StreakInfo> {
  const matches = await db.match.findMany({ where: { deletedAt: null }, select: { date: true }, orderBy: { date: "desc" } });
  const uniqueDays = Array.from(new Set(matches.map((m) => m.date))).sort().reverse(); // "YYYY-MM-DD" desc

  if (uniqueDays.length === 0) {
    return { currentStreak: 0, longestStreak: 0, activeToday: false, atRisk: false };
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const dayMs = 86400000;
  const toDate = (s: string) => new Date(s + "T00:00:00Z").getTime();

  // Série courante : days consécutifs en partant d'aujourd'hui ou d'hier
  // (tolérance de grâce d'un jour pour ne pas casser la série à la moindre
  // journée manquée si l'utilisateur revient le lendemain).
  let currentStreak = 0;
  const todayMs = toDate(todayStr);
  const mostRecentMs = toDate(uniqueDays[0]);
  const gapFromToday = Math.round((todayMs - mostRecentMs) / dayMs);

  if (gapFromToday <= 1) {
    currentStreak = 1;
    for (let i = 1; i < uniqueDays.length; i++) {
      const diff = Math.round((toDate(uniqueDays[i - 1]) - toDate(uniqueDays[i])) / dayMs);
      if (diff === 1) currentStreak++;
      else break;
    }
  }

  // Plus longue série jamais atteinte, sur tout l'historique.
  let longestStreak = 1;
  let running = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const diff = Math.round((toDate(uniqueDays[i - 1]) - toDate(uniqueDays[i])) / dayMs);
    if (diff === 1) {
      running++;
      longestStreak = Math.max(longestStreak, running);
    } else {
      running = 1;
    }
  }
  longestStreak = Math.max(longestStreak, currentStreak);

  return {
    currentStreak,
    longestStreak,
    activeToday: uniqueDays[0] === todayStr,
    atRisk: currentStreak > 0 && uniqueDays[0] !== todayStr,
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
  const matches = await db.match.findMany({ where: { deletedAt: null } });
  const total = matches.length;
  const wins = matches.filter((m) => m.result === "Victoire").length;
  const objectives = await db.objectiveItem.findMany();
  const objectivesDone = objectives.filter((o) => o.done).length;

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
      description: "Enregistrer ta première partie.",
      unlocked: total >= 1,
    },
    {
      id: "matches_10",
      label: "Régularité",
      description: "10 parties enregistrées.",
      unlocked: total >= 10,
      progress: `${Math.min(total, 10)}/10`,
    },
    {
      id: "matches_50",
      label: "Vétéran",
      description: "50 parties enregistrées.",
      unlocked: total >= 50,
      progress: `${Math.min(total, 50)}/50`,
    },
    {
      id: "winrate_50",
      label: "Équilibre trouvé",
      description: "Atteindre 50% de winrate sur au moins 10 parties.",
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
      description: "7 jours d'affilée avec au moins une partie jouée.",
      unlocked: streak.longestStreak >= 7,
      progress: `${Math.min(streak.longestStreak, 7)}/7`,
    },
  ];

  return list;
}
