import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseMatchTags, type TrainingPriorityKey } from "@/lib/defeatAnalysis";
import { missionProgress, resetMissionForContinuation, selectMissionPriority, missionInstructions } from "@/lib/missionEngine";

export const dynamic = "force-dynamic";

const RECENT_DEFEATS_WINDOW = 30;

/**
 * POST /api/coach/missions/:id/decide { decision: "continue" | "validate" | "next" }
 *
 * Fin de mission (section 10) — n'accepte une décision que si la mission a
 * bien atteint 3/3 parties (jamais de fin anticipée silencieuse).
 * - "continue" : même priorité, la progression repart à 0/3.
 * - "validate" : compétence jugée acquise, mission close.
 * - "next"     : mission close, tentative de sélection d'une nouvelle
 *   priorité différente si les données le permettent (jamais inventée).
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const decision = body?.decision as string | undefined;
  if (!["continue", "validate", "next"].includes(decision || "")) {
    return NextResponse.json({ ok: false, error: "decision doit être 'continue', 'validate' ou 'next'." }, { status: 400 });
  }

  const mission = await db.trainingMission.findUnique({ where: { id: params.id } });
  if (!mission) return NextResponse.json({ ok: false, error: "Mission introuvable." }, { status: 404 });
  if (mission.status !== "active") {
    return NextResponse.json({ ok: false, error: "Cette mission n'est plus active." }, { status: 400 });
  }

  const progress = missionProgress(mission.matchIdsJson);
  if (!progress.isReadyForDecision) {
    return NextResponse.json(
      { ok: false, error: `La mission n'a pas encore atteint ${progress.target} parties (${progress.matchCount}/${progress.target}).` },
      { status: 400 }
    );
  }

  if (decision === "continue") {
    const updated = await db.trainingMission.update({
      where: { id: mission.id },
      data: { matchIdsJson: resetMissionForContinuation() },
    });
    return NextResponse.json({ ok: true, mission: updated });
  }

  const outcome = decision === "validate" ? "Compétence jugée acquise par le joueur." : "Mission close, passage à la priorité suivante.";
  const closed = await db.trainingMission.update({
    where: { id: mission.id },
    data: { status: "completed", outcome, endedAt: new Date() },
  });

  if (decision === "validate") {
    return NextResponse.json({ ok: true, mission: closed, nextMission: null });
  }

  // decision === "next" : tentative best-effort de sélection immédiate
  // d'une nouvelle mission différente. Si les données ne le permettent
  // pas encore, on ne force rien — l'utilisateur pourra relancer la
  // sélection plus tard via POST /api/coach/missions.
  const recentDefeats = await db.match.findMany({
    where: { result: "Défaite", trainingPhase: "official_training", deletedAt: null },
    orderBy: { date: "desc" },
    take: RECENT_DEFEATS_WINDOW,
  });
  const samples = recentDefeats.map(
    (m: { id: string; date: string; mistakesJson: string | null; mainMistake: string | null }) => ({
      id: m.id,
      date: m.date,
      tags: parseMatchTags(m),
    })
  );
  const selection = selectMissionPriority(samples, mission.priorityKey as TrainingPriorityKey);

  if (!selection.hasData || !selection.priority) {
    return NextResponse.json({ ok: true, mission: closed, nextMission: null, nextMissionReason: selection.reason });
  }

  const nextMission = await db.trainingMission.create({
    data: { priorityKey: selection.priority, why: selection.why || null },
  });

  return NextResponse.json({
    ok: true,
    mission: closed,
    nextMission,
    nextMissionInstructions: missionInstructions(selection.priority),
  });
}
