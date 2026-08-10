import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { resolveOpponentLeaderId } from "@/lib/leaderNormalization";

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
  const {
    date, mode, myDeck, opponentLeader, result, cardsToWatch, notes,
    turnOrder, mulligan, openingHandQuality, mainMistake, mostUsefulCard, uselessCard, keyTurn,
    confidence, donRecoveredUnused, cardsInHandEnd, opponentLifeRemaining, gameDurationMinutes,
    mihawkActivations, mihawkEffectForgotten, mihawkEffectTooEarly, firstCost5Turn, decisiveMoment,
    inspiredByDeckId,
  } = body;

  if (!date || !mode || !myDeck || !opponentLeader || !result) {
    return NextResponse.json({ ok: false, error: "Champs requis manquants (date, mode, myDeck, opponentLeader, result)." }, { status: 400 });
  }

  // Résolution best-effort du leader normalisé — un échec ici ne doit
  // jamais empêcher l'enregistrement de la partie elle-même.
  let opponentLeaderId: string | null = null;
  try {
    opponentLeaderId = await resolveOpponentLeaderId(opponentLeader);
  } catch (e) {
    console.error("resolveOpponentLeaderId failed:", e);
  }

  const match = await db.match.create({
    data: {
      date, mode, myDeck, opponentLeader, result,
      opponentLeaderId,
      cardsToWatch: cardsToWatch || null,
      notes: notes || null,
      turnOrder: turnOrder || null,
      mulligan: typeof mulligan === "boolean" ? mulligan : null,
      openingHandQuality: openingHandQuality || null,
      mainMistake: mainMistake || null,
      mostUsefulCard: mostUsefulCard || null,
      uselessCard: uselessCard || null,
      keyTurn: keyTurn || null,
      confidence: typeof confidence === "number" ? confidence : null,
      donRecoveredUnused: typeof donRecoveredUnused === "number" ? donRecoveredUnused : null,
      cardsInHandEnd: typeof cardsInHandEnd === "number" ? cardsInHandEnd : null,
      opponentLifeRemaining: typeof opponentLifeRemaining === "number" ? opponentLifeRemaining : null,
      gameDurationMinutes: typeof gameDurationMinutes === "number" ? gameDurationMinutes : null,
      mihawkActivations: typeof mihawkActivations === "number" ? mihawkActivations : null,
      mihawkEffectForgotten: typeof mihawkEffectForgotten === "boolean" ? mihawkEffectForgotten : null,
      mihawkEffectTooEarly: typeof mihawkEffectTooEarly === "boolean" ? mihawkEffectTooEarly : null,
      firstCost5Turn: typeof firstCost5Turn === "number" ? firstCost5Turn : null,
      decisiveMoment: decisiveMoment || null,
      inspiredByDeckId: inspiredByDeckId || null,
    },
  });

  return NextResponse.json({ ok: true, match });
}
