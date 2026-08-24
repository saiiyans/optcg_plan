import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/opponent-leaders/:id { displayName?, cardNumber? }
 * Renseigne l'identifiant canonique basé sur le numéro de carte (section
 * 11) et/ou corrige le nom affiché — jamais automatique, toujours une
 * action volontaire de l'utilisateur depuis l'outil de fusion.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.displayName === "string" && body.displayName.trim()) data.displayName = body.displayName.trim();
  if (Object.prototype.hasOwnProperty.call(body, "cardNumber")) {
    data.cardNumber = body.cardNumber ? String(body.cardNumber).trim().toUpperCase() : null;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: false, error: "Aucun champ modifiable fourni." }, { status: 400 });
  }
  const leader = await db.opponentLeader.update({ where: { id: params.id }, data });
  return NextResponse.json({ ok: true, leader });
}
