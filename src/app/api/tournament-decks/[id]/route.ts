import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const deck = await db.tournamentDeck.update({
    where: { id: params.id },
    data: { savedToMyDecks: !!body.saved },
  });
  return NextResponse.json({ ok: true, deck });
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const deck = await db.tournamentDeck.findUnique({ where: { id: params.id }, include: { cards: true } });
  if (!deck) return NextResponse.json({ ok: false, error: "Deck introuvable" }, { status: 404 });
  return NextResponse.json({ ok: true, deck });
}
