import { NextRequest, NextResponse } from "next/server";
import { computePersonalStats } from "@/lib/personalStats";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const myDeck = req.nextUrl.searchParams.get("myDeck") ?? undefined;
    const stats = await computePersonalStats(myDeck);
    return NextResponse.json({ ok: true, stats });
  } catch (e: any) {
    console.error("GET /api/stats/personal failed:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
