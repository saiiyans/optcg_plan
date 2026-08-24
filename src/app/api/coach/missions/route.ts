import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseMatchTags } from "@/lib/defeatAnalysis";
import { selectMissionPriority, missionInstructions } from "@/lib/missionEngine";

export const dynamic = "force-dynamic";

const RECENT_DEFEATS_WINDOW = 30;

// GET /api/coach/missions — mission active actuelle (ou null).
export async function GET() {
  const active = await db.trainingMission.findFirst({ where: { status: "active" }, orderBy: { startedAt: "desc" } });
  return NextResponse.json({ ok: true, mission: active });
}

/**
 * POST /api/coach/missions — sélectionne et démarre une nouvelle mission
 * active à partir des défaites récentes (section 8/10). Ne fait rien si
 * une mission est déjà active (utiliser /decide pour la clore d'abord) et
 * ne crée jamais de mission sans échantillon suffisant (voir
 * computeTrainingPriority) : dans ce cas, hasData: false est renvoyé et
 * expliqué, jamais une priorité inventée.
 */
export async function POST() {
  const existing = await db.trainingMission.findFirst({ where: { status: "active" } });
  if (existing) {
    return NextResponse.json({ ok: false, error: "Une mission est déjà active.", mission: existing }, { status: 409 });
  }

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

  const selection = selectMissionPriority(samples);
  if (!selection.hasData || !selection.priority) {
    return NextResponse.json({ ok: true, hasData: false, reason: selection.reason });
  }

  const mission = await db.trainingMission.create({
    data: {
      priorityKey: selection.priority,
      why: selection.why || null,
    },
  });

  return NextResponse.json({
    ok: true,
    hasData: true,
    mission,
    instructions: missionInstructions(selection.priority),
  });
}
