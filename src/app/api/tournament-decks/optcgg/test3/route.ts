import { NextResponse } from "next/server";
import { testOptcggSample, OPTCGG_TOP_DECKS_URL } from "@/lib/optcggScraper";

/**
 * GET /api/tournament-decks/optcgg/test3
 * "Tester sur 3 decklists" pour la 3e source (OPTCG.gg) — n'écrit rien en
 * base, sert juste à vérifier que le parsing JSON tient toujours avant un
 * import réel.
 */
export async function GET() {
  try {
    const result = await testOptcggSample(OPTCGG_TOP_DECKS_URL, 3);
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message ?? String(e) }, { status: 500 });
  }
}
