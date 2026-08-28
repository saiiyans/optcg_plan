import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { computeDailyProgress } from "@/lib/trainingPhase";
import { getActiveConfig } from "@/lib/appConfig";
import { PRIORITY_MISSION, type TrainingPriorityKey } from "@/lib/defeatAnalysis";

export const dynamic = "force-dynamic";

/**
 * GET /api/coach/daily-progress — état complet du suivi quotidien
 * (compteur X/4, série, semaine, jours avant tournoi) + la mission active
 * en cours (section 10), consommé par le widget d'en-tête (section 3) et
 * la zone "Entraînement du jour" de Prépa/Journal (section 4/5).
 *
 * Ne considère QUE les parties en phase "official_training" — les parties
 * "Phase test" (historique pré-entraînement officiel) n'entrent jamais dans
 * ce calcul (section 1/13). Date du tournoi et objectifs résolus via
 * getActiveConfig() (src/lib/appConfig.ts), jamais recalculés ici.
 */
export async function GET() {
  const [officialMatches, settings, activeMission, activeConfig] = await Promise.all([
    db.match.findMany({
      where: { trainingPhase: "official_training", deletedAt: null },
      select: { date: true },
    }),
    db.appSettings.findUnique({ where: { id: "singleton" } }),
    db.trainingMission.findFirst({ where: { status: "active" }, orderBy: { startedAt: "desc" } }),
    getActiveConfig(),
  ]);

  const progress = computeDailyProgress({
    matchDates: officialMatches.map((m: { date: string }) => m.date),
    officialTrainingStartDate: settings?.officialTrainingStartDate ?? null,
    tournamentDate: activeConfig.tournamentDate,
  });

  const mission = activeMission
    ? {
        id: activeMission.id,
        priorityKey: activeMission.priorityKey as TrainingPriorityKey,
        label: activeMission.priorityKey,
        instructions: PRIORITY_MISSION[activeMission.priorityKey as TrainingPriorityKey] ?? null,
        why: activeMission.why,
        matchIds: JSON.parse(activeMission.matchIdsJson || "[]") as string[],
        startedAt: activeMission.startedAt,
      }
    : null;

  return NextResponse.json({ ok: true, progress, activeMission: mission, activeConfig });
}
