import { NextRequest, NextResponse } from "next/server";
import { computeLibraryStats, computeMyDeckStats, computeLeaderCardStats, computeCoachProgress } from "@/lib/libraryStats";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const leaderKey = req.nextUrl.searchParams.get("leader") ?? "mihawk";
  const [library, myDeck, leaderStats, coachProgress] = await Promise.all([
    computeLibraryStats(),
    computeMyDeckStats(),
    computeLeaderCardStats(leaderKey),
    computeCoachProgress(),
  ]);
  return NextResponse.json({ ok: true, library, myDeck, leaderStats, coachProgress });
}
