import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { parseDeckClipboardText } from "@/lib/deckListParser";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const deck = await db.deck.findUnique({
    where: { id: params.id },
    include: { cards: { include: { card: true } }, versions: { orderBy: { createdAt: "desc" } } },
  });
  if (!deck) return NextResponse.json({ ok: false, error: "Deck introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true, deck });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await db.deckCard.deleteMany({ where: { deckId: params.id } });
  await db.deckVersion.deleteMany({ where: { deckId: params.id } });
  await db.deck.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

/**
 * PATCH /api/personal-decks/[id]  { raw, changeReason?, personalNote? }
 *
 * Met à jour la liste d'un deck personnel. La liste PRÉCÉDENTE est
 * toujours archivée dans DeckVersion avant d'être remplacée — jamais
 * d'écrasement silencieux, conformément à la règle du projet.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const { raw, changeReason, personalNote } = body;

  // Annotation explicite nécessaire dans cet environnement de dev (client
  // Prisma généré localement "vide" — voir la note dans deckComposition.ts).
  const deck: {
    id: string;
    leaderCardNumber: string;
    cards: { quantity: number; card: { cardNumber: string } }[];
  } | null = await db.deck.findUnique({ where: { id: params.id }, include: { cards: { include: { card: true } } } });
  if (!deck) return NextResponse.json({ ok: false, error: "Deck introuvable." }, { status: 404 });

  if (!raw?.trim()) {
    return NextResponse.json({ ok: false, error: "raw (nouvelle liste collée) requis." }, { status: 400 });
  }

  const parsed = parseDeckClipboardText(raw);
  const nonLeaderEntries = parsed.filter((e) => e.cardNumber !== deck.leaderCardNumber.toUpperCase());
  const merged = new Map<string, number>();
  for (const e of nonLeaderEntries) merged.set(e.cardNumber, (merged.get(e.cardNumber) ?? 0) + e.quantity);

  if (merged.size === 0) {
    return NextResponse.json({ ok: false, error: "Aucune carte reconnue dans le texte collé." }, { status: 400 });
  }

  // Archive la liste actuelle avant de la remplacer.
  const previousList = deck.cards.map((c) => ({ cardNumber: c.card.cardNumber, quantity: c.quantity }));
  await db.deckVersion.create({
    data: {
      deckId: deck.id,
      listJson: JSON.stringify(previousList),
      personalNote: personalNote || null,
      changeReason: changeReason || null,
    },
  });

  await db.deckCard.deleteMany({ where: { deckId: deck.id } });

  const added: string[] = [];
  const skipped: string[] = [];
  for (const [cardNumber, quantity] of merged) {
    const card = await db.card.findUnique({ where: { cardNumber } });
    if (!card) {
      skipped.push(cardNumber);
      continue;
    }
    await db.deckCard.create({ data: { deckId: deck.id, cardId: card.id, quantity: Math.min(quantity, 4) } });
    added.push(cardNumber);
  }

  return NextResponse.json({ ok: true, added: added.length, skipped });
}
