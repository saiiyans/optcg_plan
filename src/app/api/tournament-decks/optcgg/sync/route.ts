import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scrapeOptcggResults, isMihawkLeader, classifyOptcggPlacement, OPTCGG_TOP_DECKS_URL, LEADER_CARD_NUMBER } from "@/lib/optcggScraper";
import { buildDeckUniqueKey } from "@/lib/deckParser";

/**
 * POST /api/tournament-decks/optcgg/sync
 * "Mettre à jour les résultats" pour la 3e source (OPTCG.gg) : détecte les
 * résultats Mihawk absents de la base parmi le flux "Top Decks" récent.
 * Aperçu uniquement — n'écrit rien ; /api/tournament-decks/optcgg/import
 * fait l'import réel ensuite.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const url = body.url ?? OPTCGG_TOP_DECKS_URL;

  try {
    const rows = await scrapeOptcggResults(url);
    const mihawkRows = rows.filter((r) => isMihawkLeader(r.leaderRaw));
    const existingKeys = new Set(
      (await db.tournamentDeck.findMany({ select: { uniqueKey: true } })).map((d: { uniqueKey: string }) => d.uniqueKey)
    );

    const newRows = mihawkRows.filter((row) => {
      const placement = classifyOptcggPlacement(row.placement);
      const key = buildDeckUniqueKey({
        leaderCardNumber: LEADER_CARD_NUMBER,
        player: row.player,
        date: row.eventDate,
        tournamentType: row.format,
        host: row.eventName,
        placementRaw: placement.placementRaw,
      });
      return !existingKeys.has(key);
    });

    return NextResponse.json({
      ok: true,
      totalRowsOnPage: mihawkRows.length,
      alreadyInDb: existingKeys.size,
      newDecksDetected: newRows.length,
      newDecksPreview: newRows.map((r) => ({ player: r.player, date: r.eventDate, placement: r.placement, event: r.eventName })),
      note: "Aperçu uniquement — appelle /api/tournament-decks/optcgg/import avec confirm:true pour importer.",
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message ?? String(e) }, { status: 500 });
  }
}
