import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { computeTrainingPriority, computeMistakeTrend, computeSkillScores, parseMatchTags, type ClassificationKey } from "@/lib/defeatAnalysis";

export const dynamic = "force-dynamic";

/**
 * GET /api/coach/journal-summary?myDeck=...
 *
 * Alimente la carte "Ta priorité actuelle" (section 8), la section
 * "Évolution des erreurs dans le temps" (section 7) et les scores de
 * compétence (section 14) du Journal. Ne regarde que les défaites — les
 * victoires n'ont pas de cause à corriger.
 */
export async function GET(req: NextRequest) {
  try {
    const myDeck = req.nextUrl.searchParams.get("myDeck") ?? undefined;
    const defeats = await db.match.findMany({
      where: { result: "Défaite", deletedAt: null, ...(myDeck ? { myDeck } : {}) },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        date: true,
        mistakesJson: true,
        mainMistake: true,
        insights: { orderBy: { createdAt: "desc" }, take: 1, select: { classification: true, classificationSecondary: true } },
      },
      take: 100,
    });

    const samples = defeats.map(
      (m: { id: string; date: string; mistakesJson: string | null; mainMistake: string | null }) => ({
        id: m.id,
        date: m.date,
        tags: parseMatchTags(m),
      })
    );

    const trainingPriority = computeTrainingPriority(samples);
    const mistakeTrend = computeMistakeTrend(samples);

    // Scores de compétence (section 14) — seulement les défaites qui ont
    // déjà une analyse du coach (classification connue), jamais devinée.
    const skillSamples = defeats
      .filter((m: { insights: { classification: string | null; classificationSecondary: string | null }[] }) => m.insights[0]?.classification)
      .map((m: { id: string; date: string; insights: { classification: string | null; classificationSecondary: string | null }[] }) => {
        let secondary: ClassificationKey[] = [];
        try {
          const parsed = JSON.parse(m.insights[0].classificationSecondary || "[]");
          if (Array.isArray(parsed)) secondary = parsed;
        } catch {
          // JSON invalide — ignoré, jamais bloquant.
        }
        return {
          id: m.id,
          date: m.date,
          classification: m.insights[0].classification as ClassificationKey,
          classificationSecondary: secondary,
        };
      });
    const skillScores = computeSkillScores(skillSamples);

    return NextResponse.json({ ok: true, trainingPriority, mistakeTrend, skillScores });
  } catch (e: any) {
    console.error("GET /api/coach/journal-summary failed:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
