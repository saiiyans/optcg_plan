import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { scrapeCardDetail } from "@/lib/scraper";
import { getLeader } from "@/lib/leaders";

/**
 * GET /api/leader-image?leader=mihawk|shanks
 * Récupère l'image réelle du Leader depuis Limitless (même mécanisme que
 * l'import de la Bibliothèque, mais pour une seule carte à la volée — les
 * Leaders ne font pas partie du périmètre normal de l'import, qui ne couvre
 * que Character/Event/Stage).
 */
export async function GET(req: NextRequest) {
  const leader = getLeader(req.nextUrl.searchParams.get("leader"));
  try {
    const scraped = await scrapeCardDetail(leader.leaderCardNumber);
    return NextResponse.json({ ok: true, imageUrl: scraped.imageUrl || null, name: scraped.name });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message ?? String(e) }, { status: 200 });
  }
}
