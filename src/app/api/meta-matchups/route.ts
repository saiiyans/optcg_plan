import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const STALE_AFTER_MS = 1000 * 60 * 60 * 24 * 6; // la source se met à jour ~1x/semaine

/**
 * GET /api/meta-matchups
 * Sert le dernier instantané en cache (jamais de scraping ici — voir
 * POST /api/meta-matchups/refresh pour la récupération à la demande).
 */
export async function GET() {
  const snap = await db.metaMatchupSnapshot.findUnique({ where: { id: "singleton" } });
  if (!snap) {
    return NextResponse.json({ ok: true, hasData: false });
  }

  let data: unknown;
  try {
    data = JSON.parse(snap.dataJson);
  } catch {
    return NextResponse.json({ ok: true, hasData: false });
  }

  const stale = Date.now() - snap.fetchedAt.getTime() > STALE_AFTER_MS;
  return NextResponse.json({ ok: true, hasData: true, data, fetchedAt: snap.fetchedAt, stale });
}
