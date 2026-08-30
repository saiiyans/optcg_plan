import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchCardKaizokuTierList } from "@/lib/cardKaizokuTierScraper";

export const dynamic = "force-dynamic";

/**
 * POST /api/tier-list/auto-classify
 *
 * SOURCE CHANGÉE le 30/08/2026 (demande explicite du joueur, plusieurs
 * fois) : utilisait onepiecetopdecks.com (nombre de decklists soumises,
 * pertinent avant la sortie officielle d'un set). OP17 étant sorti le
 * 28/08/2026, cardkaizoku.com/ranking (taux de victoire réel de vrais
 * matchs, filtre "Simulator — Standard Last Week (All Lobbies)") est
 * maintenant la meilleure source disponible — voir cardKaizokuTierScraper.ts.
 * L'ancien scraper onepiecetopdecks.com (opTopDecksTierScraper.ts) reste
 * utilisé ailleurs (tier list des CARTES individuelles) et n'est pas
 * supprimé, juste débranché d'ici.
 *
 * Ne touche JAMAIS une entrée marquée tierSource="manual". Ne modifie rien
 * en cas d'échec de la récupération (y compris repli sur cache, voir
 * CardKaizokuCache) — l'ancien classement reste affiché tel quel, seule
 * l'erreur remonte au frontend.
 */
export async function POST() {
  try {
    const result = await fetchCardKaizokuTierList();

    let applied = 0;
    let skippedManual = 0;
    let removed = 0;

    const currentKeys = new Set(
      result.entries.map((e) => e.cardNumber || `CUSTOM-${e.displayName.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}`)
    );

    // Nettoie les entrées "auto" d'une récupération précédente qui
    // n'existent plus dans le classement actuel — jamais une entrée
    // "manual", qui reste intacte quoi qu'il arrive.
    const allEntries = await db.leaderTierEntry.findMany();
    for (const entry of allEntries) {
      if (entry.tierSource === "auto" && !currentKeys.has(entry.cardNumber)) {
        await db.leaderTierEntry.delete({ where: { id: entry.id } });
        removed++;
      }
    }

    for (const e of result.entries) {
      const key = e.cardNumber || `CUSTOM-${e.displayName.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}`;
      const existing = await db.leaderTierEntry.findUnique({ where: { cardNumber: key } });
      if (existing?.tierSource === "manual") {
        skippedManual++;
        continue;
      }
      await db.leaderTierEntry.upsert({
        where: { cardNumber: key },
        update: { tier: e.tier, displayName: e.displayName, color: e.color, tierSource: "auto" },
        create: { cardNumber: key, displayName: e.displayName, color: e.color, tier: e.tier, tierSource: "auto" },
      });
      applied++;
    }

    return NextResponse.json({
      ok: true,
      applied,
      skippedManual,
      removed,
      sourceLabel: result.sourceLabel,
      sourceUrl: result.sourceUrl,
      filterLabel: result.filterLabel,
      totalGamesPlayed: result.totalGamesPlayed,
      statsFileDate: result.statsFileDate,
      capturedAt: result.capturedAt,
      totalConsidered: result.totalConsidered,
      fromCache: result.fromCache,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 200 });
  }
}
