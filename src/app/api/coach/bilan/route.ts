import { NextRequest, NextResponse } from "next/server";
import { computeCoachBilan } from "@/lib/coachBilan";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const myDeck = req.nextUrl.searchParams.get("myDeck") ?? undefined;
    const bilan = await computeCoachBilan(myDeck);
    return NextResponse.json({ ok: true, bilan });
  } catch (e: any) {
    console.error("GET /api/coach/bilan failed:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
