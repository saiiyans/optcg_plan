import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scrapeTournamentDeckTable, isStrictMihawkRow } from "@/lib/scraper";
import { parseCompactDecklist, classifyPlacement, extractParticipants, buildDeckUniqueKey } from "@/lib/deckParser";

// Format actuel : OP17 "The World's Strongest Warriors" (mis à jour le
// 28/08/2026 — l'ancienne page OP16 "The Time of Battle" ne reçoit plus de
// nouveaux résultats). Les decklists OP16 déjà importées restent en base
// (aucune suppression, voir la règle de dédoublonnage par uniqueKey
// ci-dessous) — seule la source des NOUVEAUX imports change.
const DEFAULT_URL = "https://onepiecetopdecks.com/deck-list/japan-op17-deck-list-the-worlds-strongest-warriors/";
const LEADER = "OP14-020";

/**
 * POST /api/tournament-decks/import  { url?, confirm: true }
 * Import complet des decklists Mihawk (op14mihawk + OP14-020 + Green).
 * N'écrit rien si confirm !== true. Ne supprime jamais une ancienne liste :
 * dédoublonnage par uniqueKey (Leader+joueur+date+tournoi+host+placement).
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (body.confirm !== true) {
    return NextResponse.json(
      { ok: false, error: "Confirmation requise : envoie { confirm: true }." },
      { status: 400 }
    );
  }

  const url = body.url ?? DEFAULT_URL;
  const log = await db.importLog.create({
    data: { runType: "full_import", sourceUrl: url, cardsFound: 0, cardsImported: 0, cardsUpdated: 0, cardsSkipped: 0 },
  });

  let created = 0;
  let skippedDuplicate = 0;
  let needsReview = 0;
  const errors: { row: string; error: string }[] = [];

  try {
    const allRows = await scrapeTournamentDeckTable(url);
    const mihawkRows = allRows.filter((r) => isStrictMihawkRow(r, LEADER));

    for (const row of mihawkRows) {
      try {
        const parsedDeck = parseCompactDecklist(row.rawDecklist);
        const placement = classifyPlacement(row.placementRaw);
        const uniqueKey = buildDeckUniqueKey({
          leaderCardNumber: LEADER,
          player: row.player,
          date: row.date,
          tournamentType: row.tournamentType,
          host: row.host,
          placementRaw: row.placementRaw,
        });

        const existing = await db.tournamentDeck.findUnique({ where: { uniqueKey } });
        if (existing) {
          skippedDuplicate++;
          continue;
        }

        const validationStatus = parsedDeck.valid ? "valid" : "needs_review";
        if (!parsedDeck.valid) needsReview++;

        const tDeck = await db.tournamentDeck.create({
          data: {
            uniqueKey,
            leaderCardNumber: LEADER,
            deckProfile: row.deckProfile,
            deckColor: row.deckColor,
            deckName: row.deckName,
            player: row.player,
            country: row.country,
            date: row.date,
            placementRaw: row.placementRaw,
            wins: placement.wins,
            losses: placement.losses,
            undefeated: placement.undefeated,
            status: placement.status,
            proofLevel: placement.proofLevel,
            tournamentType: row.tournamentType,
            host: row.host,
            participants: extractParticipants(row.host),
            cardCountNonLeader: parsedDeck.totalNonLeader,
            validationStatus,
            rawDecklist: row.rawDecklist,
            sourceUrl: url,
            cards: {
              create: parsedDeck.cards.map((c) => ({ cardNumber: c.cardNumber, quantity: c.quantity })),
            },
          },
        });
        created++;
        void tDeck;
      } catch (e: any) {
        errors.push({ row: row.player + " " + row.date, error: e.message ?? String(e) });
      }
    }

    await db.importLog.update({
      where: { id: log.id },
      data: {
        cardsFound: mihawkRows.length,
        cardsImported: created,
        cardsUpdated: 0,
        cardsSkipped: skippedDuplicate + errors.length,
        errors: JSON.stringify(errors),
        finishedAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      totalMihawkRowsFound: mihawkRows.length,
      created,
      skippedDuplicate,
      needsReview,
      errors,
    });
  } catch (e: any) {
    await db.importLog.update({
      where: { id: log.id },
      data: { errors: JSON.stringify([{ error: e.message ?? String(e) }]), finishedAt: new Date() },
    });
    return NextResponse.json({ ok: false, error: e.message ?? String(e) }, { status: 500 });
  }
}
