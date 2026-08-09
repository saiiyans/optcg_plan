import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveOpponentLeaderId } from "@/lib/leaderNormalization";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/backfill-opponent-leaders
 * Résout opponentLeaderId pour toutes les parties déjà enregistrées avant
 * l'introduction de la normalisation — ne touche à aucun autre champ.
 */
export async function POST() {
  const matches = await db.match.findMany({ where: { opponentLeaderId: null } });
  let updated = 0;
  for (const m of matches) {
    try {
      const id = await resolveOpponentLeaderId(m.opponentLeader);
      if (id) {
        await db.match.update({ where: { id: m.id }, data: { opponentLeaderId: id } });
        updated++;
      }
    } catch (e) {
      console.error("backfill failed for match", m.id, e);
    }
  }
  return NextResponse.json({ ok: true, total: matches.length, updated });
}
