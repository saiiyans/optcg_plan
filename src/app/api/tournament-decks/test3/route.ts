import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { scrapeTournamentDeckTable, isStrictMihawkRow } from "@/lib/scraper";
import { parseCompactDecklist, classifyPlacement, extractParticipants } from "@/lib/deckParser";

const DEFAULT_URL = "https://onepiecetopdecks.com/deck-list/japan-op16-deck-list-the-time-of-battle/";
const LEADER = "OP14-020";

/**
 * GET /api/tournament-decks/test3
 * Récupère UNIQUEMENT 3 decklists Mihawk (op14mihawk + OP14-020 + Green),
 * les parse, vérifie 50 cartes, et affiche les erreurs. N'écrit rien en base
 * — c'est l'étape de vérification obligatoire avant tout import complet.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url") ?? DEFAULT_URL;
  try {
    const allRows = await scrapeTournamentDeckTable(url);
    const mihawkRows = allRows.filter((r) => isStrictMihawkRow(r, LEADER)).slice(0, 3);

    const parsed = mihawkRows.map((row) => {
      const deck = parseCompactDecklist(row.rawDecklist);
      const placement = classifyPlacement(row.placementRaw);
      return {
        deckName: row.deckName,
        player: row.player,
        country: row.country,
        date: row.date,
        placementRaw: row.placementRaw,
        tournamentType: row.tournamentType,
        host: row.host,
        participants: extractParticipants(row.host),
        parsedLeader: deck.leader,
        cardCountNonLeader: deck.totalNonLeader,
        parseErrors: deck.errors,
        parseValid: deck.valid,
        placement,
        sampleCards: deck.cards.slice(0, 5), // aperçu, pas la liste complète dans la réponse
      };
    });

    return NextResponse.json({
      ok: true,
      totalRowsOnPage: allRows.length,
      totalMihawkRowsFound: allRows.filter((r) => isStrictMihawkRow(r, LEADER)).length,
      sample: parsed,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message ?? String(e) }, { status: 500 });
  }
}
