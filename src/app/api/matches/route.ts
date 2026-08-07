import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const myDeck = sp.get("myDeck");
  const mode = sp.get("mode");

  const matches = await db.match.findMany({
    where: {
      ...(myDeck ? { myDeck } : {}),
      ...(mode ? { mode } : {}),
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ ok: true, matches });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { date, mode, myDeck, opponentLeader, result, cardsToWatch, notes } = body;

  if (!date || !mode || !myDeck || !opponentLeader || !result) {
    return NextResponse.json({ ok: false, error: "Champs requis manquants (date, mode, myDeck, opponentLeader, result)." }, { status: 400 });
  }

  const match = await db.match.create({
    data: { date, mode, myDeck, opponentLeader, result, cardsToWatch: cardsToWatch || null, notes: notes || null },
  });

  return NextResponse.json({ ok: true, match });
}
