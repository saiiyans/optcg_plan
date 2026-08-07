import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * PATCH /api/cards/[cardNumber]/rating
 * body: { leaderContext: string, stars: number }  -> fixe une note manuelle
 * body: { leaderContext: string, reset: true }    -> repasse en note automatique
 *
 * Une note manuelle (isManualOverride=true) n'est plus jamais écrasée par un
 * futur import (voir /api/import/confirm/route.ts, qui vérifie ce champ
 * avant de mettre à jour).
 */
export async function PATCH(req: NextRequest, { params }: { params: { cardNumber: string } }) {
  const body = await req.json().catch(() => ({}));
  const { leaderContext, stars, reset } = body;

  if (!leaderContext) {
    return NextResponse.json({ ok: false, error: "leaderContext requis." }, { status: 400 });
  }

  const card = await db.card.findUnique({ where: { cardNumber: params.cardNumber.toUpperCase() } });
  if (!card) {
    return NextResponse.json({ ok: false, error: "Carte introuvable." }, { status: 404 });
  }

  if (reset) {
    const rating = await db.personalRating.update({
      where: { cardId_leaderContext: { cardId: card.id, leaderContext } },
      data: { isManualOverride: false },
    }).catch(() => null);
    return NextResponse.json({ ok: true, rating });
  }

  if (typeof stars !== "number" || stars < 0 || stars > 5) {
    return NextResponse.json({ ok: false, error: "stars doit être un nombre entre 0 et 5." }, { status: 400 });
  }

  const rating = await db.personalRating.upsert({
    where: { cardId_leaderContext: { cardId: card.id, leaderContext } },
    update: { stars, isManualOverride: true },
    create: {
      cardId: card.id,
      leaderContext,
      stars,
      autoStars: stars,
      justification: "Note fixée manuellement.",
      confidence: "élevé",
      isManualOverride: true,
    },
  });

  return NextResponse.json({ ok: true, rating });
}
