import { NextResponse } from "next/server";
import { computeStreak, computeAchievements } from "@/lib/achievements";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [streak, achievements] = await Promise.all([computeStreak(), computeAchievements()]);
    return NextResponse.json({ ok: true, streak, achievements });
  } catch (e: any) {
    console.error("GET /api/achievements failed:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
