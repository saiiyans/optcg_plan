import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { getLeader } from "@/lib/leaders";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status"); // winner | top_performer | unverified
  const undefeatedOnly = sp.get("undefeated") === "true";
  const country = sp.get("country");
  const player = sp.get("player");
  const includesCard = sp.get("includesCard");
  const excludesCard = sp.get("excludesCard");
  const savedOnly = sp.get("saved") === "true";
  const leader = getLeader(sp.get("leader"));

  const decks = await db.tournamentDeck.findMany({
    where: {
      deckProfile: leader.deckProfile,
      ...(status ? { status } : {}),
      ...(undefeatedOnly ? { undefeated: true } : {}),
      ...(country ? { country: { contains: country, mode: "insensitive" } } : {}),
      ...(player ? { player: { contains: player, mode: "insensitive" } } : {}),
      ...(savedOnly ? { savedToMyDecks: true } : {}),
    },
    include: { cards: true },
    orderBy: { date: "desc" },
  });

  let result = decks;
  if (includesCard) result = result.filter((d) => d.cards.some((c) => c.cardNumber === includesCard.toUpperCase()));
  if (excludesCard) result = result.filter((d) => !d.cards.some((c) => c.cardNumber === excludesCard.toUpperCase()));

  return NextResponse.json({ ok: true, count: result.length, decks: result });
}
