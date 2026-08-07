import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const deck = await db.deck.findUnique({
    where: { id: params.id },
    include: { cards: { include: { card: true } } },
  });
  if (!deck) return NextResponse.json({ ok: false, error: "Deck introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true, deck });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await db.deckCard.deleteMany({ where: { deckId: params.id } });
  await db.deck.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
