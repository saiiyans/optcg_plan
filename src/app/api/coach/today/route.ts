import { NextRequest, NextResponse } from "next/server";
import { computeDailyMission, computeTopWeakness, computeStrengths, computeRecentProgress } from "@/lib/coachDiagnostic";

export const dynamic = "force-dynamic";

/**
 * GET /api/coach/today?myDeck=Mihawk+OP14-020
 *
 * Diagnostic complet pour le bloc "Coach Personnel" de l'accueil :
 * priorité du jour (mission), faiblesse principale, forces (matchups
 * confortables), progression récente. Chacun peut indépendamment renvoyer
 * hasData=false avec une raison explicite plutôt qu'une conclusion
 * inventée sur un petit échantillon.
 */
export async function GET(req: NextRequest) {
  try {
    const myDeck = req.nextUrl.searchParams.get("myDeck") ?? undefined;
    const [mission, weakness, strengths, progress] = await Promise.all([
      computeDailyMission(myDeck),
      computeTopWeakness(myDeck),
      computeStrengths(myDeck),
      computeRecentProgress(myDeck),
    ]);
    return NextResponse.json({ ok: true, mission, weakness, strengths, progress });
  } catch (e: any) {
    // Même raison que /api/cards : un corps 500 vide plutôt qu'un message
    // clair rendait le vrai problème (le plus souvent la connexion base de
    // données) invisible depuis le navigateur.
    console.error("GET /api/coach/today failed:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
