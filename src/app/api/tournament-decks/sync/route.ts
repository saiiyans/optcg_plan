import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scrapeTournamentDeckTable, isStrictMihawkRow } from "@/lib/scraper";
import { classifyPlacement, buildDeckUniqueKey } from "@/lib/deckParser";

const DEFAULT_URL = "https://onepiecetopdecks.com/deck-list/japan-op16-deck-list-the-time-of-battle/";
const LEADER = "OP14-020";

/**
 * POST /api/tournament-decks/sync
 * "Mettre à jour les résultats OP16" : détecte les nouvelles decklists
 * Mihawk absentes de la base. Aperçu uniquement — ne crée rien ; appelle
 * /api/tournament-decks/import ensuite pour les importer réellement.
 * Ne supprime jamais une ancienne liste, même si elle a disparu de la page source.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const url = body.url ?? DEFAULT_URL;

  try {
    const allRows = await scrapeTournamentDeckTable(url);
    const mihawkRows = allRows.filter((r) => isStrictMihawkRow(r, LEADER));

    const existingKeys = new Set((await db.tournamentDeck.findMany({ select: { uniqueKey: true } })).map((d) => d.uniqueKey));

    const newRows = mihawkRows.filter((row) => {
      const placement = classifyPlacement(row.placementRaw);
      const key = buildDeckUniqueKey({
        leaderCardNumber: LEADER,
        player: row.player,
        date: row.date,
        tournamentType: row.tournamentType,
        host: row.host,
        placementRaw: row.placementRaw,
      });
      return !existingKeys.has(key) && (placement.status === "winner" || placement.status === "top_performer");
    });

    return NextResponse.json({
      ok: true,
      totalMihawkRowsOnPage: mihawkRows.length,
      alreadyInDb: existingKeys.size,
      newDecksDetected: newRows.length,
      newDecksPreview: newRows.map((r) => ({ player: r.player, date: r.date, placementRaw: r.placementRaw, host: r.host })),
      note: "Aperçu uniquement — appelle /api/tournament-decks/import avec confirm:true pour importer.",
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message ?? String(e) }, { status: 500 });
  }
}
