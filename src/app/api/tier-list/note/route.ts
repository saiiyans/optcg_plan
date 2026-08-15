import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/tier-list/note  { cardNumber, note }
 * Enregistre/modifie la note de matchup (texte libre) d'un leader — champ
 * déjà présent sur LeaderTierEntry, jusqu'ici inutilisé. Ne touche jamais
 * au tier ni aux autres champs.
 */
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { cardNumber, note } = body;
  if (!cardNumber) {
    return NextResponse.json({ ok: false, error: "cardNumber requis." }, { status: 400 });
  }
  const entry = await db.leaderTierEntry.update({
    where: { cardNumber },
    data: { note: note ?? null },
  }).catch(() => null);
  if (!entry) return NextResponse.json({ ok: false, error: "Leader introuvable dans la tier list." }, { status: 404 });
  return NextResponse.json({ ok: true, entry });
}
