import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/matches/:id/restore — annule une suppression (section 18),
// tant que la partie n'a pas été purgée manuellement. Idempotent : appeler
// deux fois sur une partie déjà restaurée ne fait rien de plus.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const existing = await db.match.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ ok: false, error: "Partie introuvable." }, { status: 404 });
  const match = await db.match.update({ where: { id: params.id }, data: { deletedAt: null } });
  return NextResponse.json({ ok: true, match });
}
