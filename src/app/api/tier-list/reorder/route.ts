import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/tier-list/reorder  { tier: string, cardNumbers: string[] }
 *
 * Enregistre l'ordre exact des leaders dans un tier, dans l'ordre où ils
 * sont donnés — utilisé après un glisser-déposer pour repositionner une
 * carte précisément (pas seulement changer de tier).
 */
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { tier, cardNumbers } = body;
  if (!tier || !Array.isArray(cardNumbers)) {
    return NextResponse.json({ ok: false, error: "tier et cardNumbers[] requis." }, { status: 400 });
  }

  for (let i = 0; i < cardNumbers.length; i++) {
    await db.leaderTierEntry.update({
      where: { cardNumber: cardNumbers[i] },
      data: { order: i },
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, updated: cardNumbers.length });
}
