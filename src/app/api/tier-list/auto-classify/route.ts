import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchOpTopDecksTierList } from "@/lib/opTopDecksTierScraper";

export const dynamic = "force-dynamic";

/**
 * POST /api/tier-list/auto-classify
 *
 * Relit EN DIRECT la page de decklists onepiecetopdecks.com (voir
 * opTopDecksTierScraper.ts) et applique le classement calculé à tous les
 * leaders qui n'ont pas déjà été corrigés à la main. Ne touche JAMAIS une
 * entrée marquée tierSource="manual". Ne modifie rien en cas d'échec de la
 * récupération — l'ancien classement reste affiché tel quel, seule l'erreur
 * remonte au frontend (même principe que /api/meta-matchups/refresh).
 *
 * Les leaders sans numéro de carte confirmé reçoivent une clé synthétique
 * "CUSTOM-..." plutôt qu'un numéro de carte inventé, cohérent avec l'ajout
 * manuel côté interface.
 */
export async function POST() {
  try {
    const result = await fetchOpTopDecksTierList();

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
      formatLabel: result.formatLabel,
      capturedAt: result.capturedAt,
      totalDecksScanned: result.totalDecksScanned,
      distinctLeaders: result.distinctLeaders,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 200 });
  }
}
