import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const entries = await db.keyCardEntry.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({ ok: true, entries });
}

/**
 * POST /api/key-cards  { cardNumber, leaderCardNumber }
 * Associe une carte verte comme "clé" contre un leader — jamais de
 * doublon (contrainte unique côté base), une carte peut être associée à
 * plusieurs leaders sans jamais être retirée d'une association existante.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { cardNumber, leaderCardNumber } = body;
  if (!cardNumber || !leaderCardNumber) {
    return NextResponse.json({ ok: false, error: "cardNumber et leaderCardNumber requis." }, { status: 400 });
  }
  const entry = await db.keyCardEntry.upsert({
    where: { cardNumber_leaderCardNumber: { cardNumber, leaderCardNumber } },
    update: {},
    create: { cardNumber, leaderCardNumber },
  });
  return NextResponse.json({ ok: true, entry });
}

export async function DELETE(req: NextRequest) {
  const cardNumber = req.nextUrl.searchParams.get("cardNumber");
  const leaderCardNumber = req.nextUrl.searchParams.get("leaderCardNumber");
  if (!cardNumber || !leaderCardNumber) {
    return NextResponse.json({ ok: false, error: "cardNumber et leaderCardNumber requis." }, { status: 400 });
  }
  await db.keyCardEntry.delete({ where: { cardNumber_leaderCardNumber: { cardNumber, leaderCardNumber } } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
