import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  scrapeOptcggResults,
  scrapeOptcggDecklist,
  isMihawkLeader,
  classifyOptcggPlacement,
  OPTCGG_TOP_DECKS_URL,
  LEADER_CARD_NUMBER,
} from "@/lib/optcggScraper";
import { buildDeckUniqueKey } from "@/lib/deckParser";

/**
 * POST /api/tournament-decks/optcgg/import  { url?, confirm: true }
 * Import complet des résultats Mihawk depuis OPTCG.gg (3e source,
 * complémentaire à Asie/onepiecetopdecks.com et US-International/Limitless
 * déjà intégrées). Écrit dans les MÊMES tables TournamentDeck/
 * TournamentDeckCard — la région se déduit à la lecture (voir regionOf()
 * dans /api/tournament-decks), classée "international" comme Limitless car
 * cette source ne fournit aucun pays par résultat non plus. N'écrit rien si
 * confirm !== true. Ne supprime jamais un ancien résultat : dédoublonnage
 * par uniqueKey.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (body.confirm !== true) {
    return NextResponse.json({ ok: false, error: "Confirmation requise : envoie { confirm: true }." }, { status: 400 });
  }

  const url = body.url ?? OPTCGG_TOP_DECKS_URL;
  const log = await db.importLog.create({
    data: { runType: "full_import", sourceUrl: url, cardsFound: 0, cardsImported: 0, cardsUpdated: 0, cardsSkipped: 0 },
  });

  let created = 0;
  let skippedDuplicate = 0;
  let needsReview = 0;
  const errors: { row: string; error: string }[] = [];

  try {
    const rows = await scrapeOptcggResults(url);
    const mihawkRows = rows.filter((r) => isMihawkLeader(r.leaderRaw));

    for (const row of mihawkRows) {
      try {
        const placement = classifyOptcggPlacement(row.placement);
        const uniqueKey = buildDeckUniqueKey({
          leaderCardNumber: LEADER_CARD_NUMBER,
          player: row.player,
          date: row.eventDate,
          tournamentType: row.format,
          host: row.eventName,
          placementRaw: placement.placementRaw,
        });

        const existing = await db.tournamentDeck.findUnique({ where: { uniqueKey } });
        if (existing) {
          skippedDuplicate++;
          continue;
        }

        // 2e requête (API JSON de la decklist) uniquement pour les lignes
        // réellement nouvelles — jamais pour un doublon déjà en base.
        const parsed = await scrapeOptcggDecklist(row.apiUrl);
        const validationStatus = parsed.valid ? "valid" : "needs_review";
        if (!parsed.valid) needsReview++;

        await db.tournamentDeck.create({
          data: {
            uniqueKey,
            leaderCardNumber: LEADER_CARD_NUMBER,
            deckProfile: "op14mihawk",
            deckColor: "Green",
            deckName: "G Mihawk",
            format: row.format,
            player: row.player,
            country: "—", // non fourni par cette source, jamais deviné
            date: row.eventDate,
            placementRaw: placement.placementRaw,
            wins: null,
            losses: null,
            undefeated: false,
            status: placement.status,
            proofLevel: placement.proofLevel,
            tournamentType: row.format,
            host: row.eventName,
            participants: null,
            cardCountNonLeader: parsed.totalNonLeader,
            validationStatus,
            rawDecklist: parsed.rawDecklistCompact,
            sourceUrl: row.listUrl,
            cards: {
              create: parsed.cards.map((c) => ({ cardNumber: c.cardNumber, quantity: c.quantity })),
            },
          },
        });
        created++;
      } catch (e: any) {
        errors.push({ row: row.player + " " + row.eventDate, error: e.message ?? String(e) });
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

    return NextResponse.json({ ok: true, totalRowsFound: mihawkRows.length, created, skippedDuplicate, needsReview, errors });
  } catch (e: any) {
    await db.importLog.update({
      where: { id: log.id },
      data: { errors: JSON.stringify([{ error: e.message ?? String(e) }]), finishedAt: new Date() },
    });
    return NextResponse.json({ ok: false, error: e.message ?? String(e) }, { status: 500 });
  }
}
