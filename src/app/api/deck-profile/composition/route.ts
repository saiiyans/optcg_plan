import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { computeDeckComposition } from "@/lib/deckComposition";

export const dynamic = "force-dynamic";

/**
 * GET /api/deck-profile/composition?type=personal|winning&id=X
 * Retourne la liste + composition réelle calculée pour un deck personnel
 * ou un deck gagnant sauvegardé — jamais pour la référence Mihawk, qui
 * reste gérée statiquement côté client (contenu narratif écrit à la main).
 */
export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type");
  const id = req.nextUrl.searchParams.get("id");
  if (!type || !id) {
    return NextResponse.json({ ok: false, error: "type et id requis." }, { status: 400 });
  }

  try {
    let name = "";
    let leaderCardNumber = "";
    let list: { cardNumber: string; quantity: number }[] = [];

    if (type === "personal") {
      // Annotation explicite nécessaire dans cet environnement de dev (client
      // Prisma généré localement "vide" — voir la note dans deckComposition.ts).
      const deck: {
        name: string;
        leaderCardNumber: string;
        cards: { quantity: number; card: { cardNumber: string } }[];
      } | null = await db.deck.findUnique({ where: { id }, include: { cards: { include: { card: true } } } });
      if (!deck) return NextResponse.json({ ok: false, error: "Deck introuvable." }, { status: 404 });
      name = deck.name;
      leaderCardNumber = deck.leaderCardNumber;
      list = deck.cards.map((c) => ({ cardNumber: c.card.cardNumber, quantity: c.quantity }));
    } else if (type === "winning") {
      const deck: {
        deckName: string;
        player: string;
        leaderCardNumber: string;
        cards: { cardNumber: string; quantity: number }[];
      } | null = await db.tournamentDeck.findUnique({ where: { id }, include: { cards: true } });
      if (!deck) return NextResponse.json({ ok: false, error: "Deck introuvable." }, { status: 404 });
      name = `${deck.deckName} — ${deck.player}`;
      leaderCardNumber = deck.leaderCardNumber;
      list = deck.cards.map((c) => ({ cardNumber: c.cardNumber, quantity: c.quantity }));
    } else {
      return NextResponse.json({ ok: false, error: "type doit être 'personal' ou 'winning'." }, { status: 400 });
    }

    const composition = await computeDeckComposition(list);
    return NextResponse.json({ ok: true, name, leaderCardNumber, composition });
  } catch (e: any) {
    console.error("GET /api/deck-profile/composition failed:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
