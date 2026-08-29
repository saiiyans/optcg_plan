import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scrapeTournamentDeckTable, isStrictMihawkRow } from "@/lib/scraper";
import { classifyPlacement, buildDeckUniqueKey } from "@/lib/deckParser";
import { checkSyncUrl } from "@/lib/importRouteHelpers";

// Format actuel : OP17 "The World's Strongest Warriors" (mis à jour le
// 28/08/2026) — voir la même note dans import/route.ts.
const DEFAULT_URL = "https://onepiecetopdecks.com/deck-list/japan-op17-deck-list-the-worlds-strongest-warriors/";
const LEADER = "OP14-020";

/**
 * POST /api/tournament-decks/sync
 * "Mettre à jour les résultats OP17" : détecte les nouvelles decklists
 * Mihawk absentes de la base. Aperçu uniquement — ne crée rien ; appelle
 * /api/tournament-decks/import ensuite pour les importer réellement.
 * Ne supprime jamais une ancienne liste, même si elle a disparu de la page source.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const url = body.url ?? DEFAULT_URL;
  // Empêche cette route de récupérer une URL arbitraire côté serveur
  // (SSRF) — seuls les domaines déjà utilisés par l'app sont acceptés.
  const urlError = checkSyncUrl(url);
  if (urlError) return urlError;

  try {
    const allRows = await scrapeTournamentDeckTable(url);
    const mihawkRows = allRows.filter((r) => isStrictMihawkRow(r, LEADER));

    // Annotation explicite nécessaire dans cet environnement de dev (client
    // Prisma généré localement "vide" — voir la note dans deckComposition.ts).
    const existingRows: { uniqueKey: string }[] = await db.tournamentDeck.findMany({ select: { uniqueKey: true } });
    const existingKeys = new Set(existingRows.map((d) => d.uniqueKey));

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
