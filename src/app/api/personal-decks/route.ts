import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Parseur souple pour du texte collé depuis le presse-papier : accepte le
 * format compact "1nOP14-020a4nOP07-022a..." (copié depuis un lien
 * onepiecetopdecks.com) aussi bien que des lignes libres du type
 * "4x OP07-022", "4 OP07-022" ou "OP07-022 x4".
 *
 * N'invente jamais une quantité : chaque paire {quantité, numéro} vient
 * directement du texte collé, jamais déduite.
 */
function parseClipboardText(raw: string): { cardNumber: string; quantity: number }[] {
  const found: { cardNumber: string; quantity: number }[] = [];
  const regex = /(\d+)\s*n?x?\s*([A-Z]{2,4}\d{1,2}-\d{3})/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(raw)) !== null) {
    found.push({ quantity: parseInt(m[1], 10), cardNumber: m[2].toUpperCase() });
  }
  return found;
}

export async function GET() {
  const decks = await db.deck.findMany({
    include: { cards: { include: { card: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ ok: true, decks });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { name, leaderCardNumber, raw } = body;

  if (!name?.trim() || !leaderCardNumber || !raw?.trim()) {
    return NextResponse.json({ ok: false, error: "name, leaderCardNumber et raw sont requis." }, { status: 400 });
  }

  const parsed = parseClipboardText(raw);
  // Le token du Leader peut apparaître dans le texte collé (format compact) —
  // on l'exclut des cartes du deck puisqu'il est déjà donné séparément.
  const nonLeaderEntries = parsed.filter((e) => e.cardNumber !== leaderCardNumber.toUpperCase());

  // Fusionne les doublons éventuels (même carte citée deux fois).
  const merged = new Map<string, number>();
  for (const e of nonLeaderEntries) merged.set(e.cardNumber, (merged.get(e.cardNumber) ?? 0) + e.quantity);

  if (merged.size === 0) {
    return NextResponse.json({ ok: false, error: "Aucune carte reconnue dans le texte collé. Format attendu : \"4nOP07-022\", \"4x OP07-022\" ou \"4 OP07-022\"." }, { status: 400 });
  }

  const totalCards = [...merged.values()].reduce((a, b) => a + b, 0);

  const deck = await db.deck.create({ data: { name: name.trim(), leaderCardNumber: leaderCardNumber.toUpperCase() } });

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

  return NextResponse.json({
    ok: true,
    deckId: deck.id,
    totalParsed: merged.size,
    totalCards,
    added,
    skipped,
    note: skipped.length > 0 ? `${skipped.length} carte(s) pas encore dans la Bibliothèque, donc pas ajoutée(s) au deck : ${skipped.join(", ")}. Importe-les puis recrée le deck si besoin.` : undefined,
  });
}
