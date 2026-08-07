import { NextRequest, NextResponse } from "next/server";
import { computeDailyMission, computeTopWeakness } from "@/lib/coachDiagnostic";

export const dynamic = "force-dynamic";

/**
 * GET /api/coach/today?myDeck=Mihawk+OP14-020
 *
 * Diagnostic du jour pour l'écran d'accueil : mission (matchup prioritaire)
 * + faiblesse principale (erreur la plus fréquente). Chacun des deux peut
 * indépendamment renvoyer hasData=false avec une raison explicite plutôt
 * qu'une conclusion inventée sur un petit échantillon.
 */
export async function GET(req: NextRequest) {
  try {
    const myDeck = req.nextUrl.searchParams.get("myDeck") ?? undefined;
    const [mission, weakness] = await Promise.all([
      computeDailyMission(myDeck),
      computeTopWeakness(myDeck),
    ]);
    return NextResponse.json({ ok: true, mission, weakness });
  } catch (e: any) {
    console.error("GET /api/coach/today failed:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
