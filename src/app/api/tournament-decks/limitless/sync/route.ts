import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scrapeLimitlessResults, LIMITLESS_ARCHETYPE_URL, LEADER_CARD_NUMBER } from "@/lib/limitlessScraper";
import { classifyPlacement, buildDeckUniqueKey } from "@/lib/deckParser";
import { checkSyncUrl } from "@/lib/importRouteHelpers";

/**
 * POST /api/tournament-decks/limitless/sync
 * "Mettre à jour les résultats US/International" : détecte les nouveaux
 * résultats Mihawk (Limitless) absents de la base. Aperçu uniquement — ne
 * crée rien ; appelle /api/tournament-decks/limitless/import ensuite pour
 * importer réellement. Ne supprime jamais un ancien résultat.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const url = body.url ?? LIMITLESS_ARCHETYPE_URL;
  const urlError = checkSyncUrl(url);
  if (urlError) return urlError;

  try {
    const rows = await scrapeLimitlessResults(url);
    const existingKeys = new Set(
      (await db.tournamentDeck.findMany({ select: { uniqueKey: true } })).map((d: { uniqueKey: string }) => d.uniqueKey)
    );

    const newRows = rows.filter((row) => {
      const placement = classifyPlacement(row.placementRaw);
      const key = buildDeckUniqueKey({
        leaderCardNumber: LEADER_CARD_NUMBER,
        player: row.player,
        date: row.date,
        tournamentType: row.format,
        host: row.tournamentName,
        placementRaw: row.placementRaw,
      });
      return !existingKeys.has(key) && (placement.status === "winner" || placement.status === "top_performer");
    });

    return NextResponse.json({
      ok: true,
      totalRowsOnPage: rows.length,
      alreadyInDb: existingKeys.size,
      newDecksDetected: newRows.length,
      newDecksPreview: newRows.map((r) => ({ player: r.player, date: r.date, placementRaw: r.placementRaw, host: r.tournamentName })),
      note: "Aperçu uniquement — appelle /api/tournament-decks/limitless/import avec confirm:true pour importer.",
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message ?? String(e) }, { status: 500 });
  }
}
