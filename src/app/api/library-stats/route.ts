import { NextRequest, NextResponse } from "next/server";
import { computeLibraryStats, computeMyDeckStats, computeLeaderCardStats, computeCoachProgress } from "@/lib/libraryStats";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const leaderKey = req.nextUrl.searchParams.get("leader") ?? "mihawk";
  try {
    const [library, myDeck, leaderStats, coachProgress] = await Promise.all([
      computeLibraryStats(),
      computeMyDeckStats(),
      computeLeaderCardStats(leaderKey),
      computeCoachProgress(),
    ]);
    return NextResponse.json({ ok: true, library, myDeck, leaderStats, coachProgress });
  } catch (e: any) {
    // Même raison que /api/cards : un corps 500 vide plutôt qu'un message
    // clair rendait le vrai problème (le plus souvent la connexion base de
    // données) invisible depuis le navigateur.
    console.error("GET /api/library-stats failed:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
