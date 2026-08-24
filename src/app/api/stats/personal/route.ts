import { NextRequest, NextResponse } from "next/server";
import { computePersonalStats, type PhaseFilter } from "@/lib/personalStats";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const myDeck = req.nextUrl.searchParams.get("myDeck") ?? undefined;
    const phaseParam = req.nextUrl.searchParams.get("phase");
    const phase: PhaseFilter = phaseParam === "test" || phaseParam === "all" ? phaseParam : "official_training";
    const stats = await computePersonalStats(myDeck, phase);
    return NextResponse.json({ ok: true, stats });
  } catch (e: any) {
    console.error("GET /api/stats/personal failed:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
