import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const VALID_TIERS = ["S", "A", "B", "C", "D"];

export async function GET() {
  const entries = await db.leaderTierEntry.findMany({ orderBy: [{ tier: "asc" }, { displayName: "asc" }] });
  return NextResponse.json({ ok: true, entries });
}

/**
 * PATCH /api/tier-list  { cardNumber, tier, displayName?, color? }
 * Place/déplace un leader dans un tier — toujours marqué tierSource
 * "manual", même s'il avait été placé automatiquement avant : une
 * correction humaine prime toujours sur le classement automatique.
 */
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { cardNumber, tier, displayName, color } = body;

  if (!cardNumber || !VALID_TIERS.includes(tier)) {
    return NextResponse.json({ ok: false, error: `cardNumber requis, tier doit être l'un de ${VALID_TIERS.join(", ")}.` }, { status: 400 });
  }

  const entry = await db.leaderTierEntry.upsert({
    where: { cardNumber },
    update: { tier, tierSource: "manual", ...(displayName ? { displayName } : {}), ...(color ? { color } : {}) },
    create: { cardNumber, displayName: displayName || cardNumber, color: color || null, tier, tierSource: "manual" },
  });

  return NextResponse.json({ ok: true, entry });
}

export async function DELETE(req: NextRequest) {
  const cardNumber = req.nextUrl.searchParams.get("cardNumber");
  if (!cardNumber) return NextResponse.json({ ok: false, error: "cardNumber requis." }, { status: 400 });
  await db.leaderTierEntry.delete({ where: { cardNumber } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
