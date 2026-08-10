import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/tournament-decks/[id]/duplicate  { asTest?: boolean }
 *
 * Crée une VRAIE copie personnelle indépendante (Deck + DeckCard) à partir
 * d'un deck gagnant sauvegardé — jamais une modification du deck gagnant
 * original, qui reste intact et consultable tel quel. Les cartes non
 * encore importées dans la Bibliothèque sont ignorées (signalées dans la
 * réponse) plutôt que de bloquer toute la duplication.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const asTest = !!body?.asTest;

  const source = await db.tournamentDeck.findUnique({ where: { id: params.id }, include: { cards: true } });
  if (!source) return NextResponse.json({ ok: false, error: "Deck gagnant introuvable." }, { status: 404 });

  const newDeck = await db.deck.create({
    data: {
      name: `${source.deckName} — ${source.player} (${asTest ? "version test" : "copie"})`,
      leaderCardNumber: source.leaderCardNumber,
    },
  });

  const skipped: string[] = [];
  for (const c of source.cards) {
    const card = await db.card.findUnique({ where: { cardNumber: c.cardNumber } });
    if (!card) {
      skipped.push(c.cardNumber);
      continue;
    }
    await db.deckCard.create({ data: { deckId: newDeck.id, cardId: card.id, quantity: Math.min(c.quantity, 4) } });
  }

  return NextResponse.json({ ok: true, newDeckId: newDeck.id, skipped });
}
