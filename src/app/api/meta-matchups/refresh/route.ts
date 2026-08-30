import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchMetaMatchups } from "@/lib/metaMatchupScraper";

export const dynamic = "force-dynamic";

/**
 * POST /api/meta-matchups/refresh
 * Déclenché UNIQUEMENT par le bouton "Actualiser" côté client — jamais en
 * tâche de fond automatique (voir metaMatchupScraper.ts, note d'éthique).
 * En cas d'échec, l'ancien instantané en base n'est jamais écrasé : il
 * reste consultable, seule l'erreur remonte au frontend.
 */
export async function POST() {
  try {
    const data = await fetchMetaMatchups();
    const snap = await db.metaMatchupSnapshot.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", dataJson: JSON.stringify(data), sourceUrl: data.sourceUrl },
      update: { dataJson: JSON.stringify(data), sourceUrl: data.sourceUrl },
    });
    return NextResponse.json({ ok: true, data, fetchedAt: snap.fetchedAt });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 200 });
  }
}
