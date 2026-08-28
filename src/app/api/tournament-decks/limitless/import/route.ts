import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scrapeLimitlessResults, scrapeLimitlessDecklist, LIMITLESS_ARCHETYPE_URL, LEADER_CARD_NUMBER } from "@/lib/limitlessScraper";
import { classifyPlacement, buildDeckUniqueKey } from "@/lib/deckParser";

/**
 * POST /api/tournament-decks/limitless/import  { url?, confirm: true }
 * Import complet des résultats Mihawk depuis Limitless TCG (source
 * "US / International", complémentaire à /api/tournament-decks/import qui
 * couvre la source "Asie" onepiecetopdecks.com). Écrit dans les MÊMES
 * tables TournamentDeck/TournamentDeckCard — la distinction de région se
 * fait à la lecture, via sourceUrl (voir /api/tournament-decks GET), pas
 * par un champ séparé. N'écrit rien si confirm !== true. Ne supprime
 * jamais un ancien résultat : dédoublonnage par uniqueKey.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (body.confirm !== true) {
    return NextResponse.json({ ok: false, error: "Confirmation requise : envoie { confirm: true }." }, { status: 400 });
  }

  const url = body.url ?? LIMITLESS_ARCHETYPE_URL;
  const log = await db.importLog.create({
    data: { runType: "full_import", sourceUrl: url, cardsFound: 0, cardsImported: 0, cardsUpdated: 0, cardsSkipped: 0 },
  });

  let created = 0;
  let skippedDuplicate = 0;
  let needsReview = 0;
  const errors: { row: string; error: string }[] = [];

  try {
    const rows = await scrapeLimitlessResults(url);

    for (const row of rows) {
      try {
        const placement = classifyPlacement(row.placementRaw);
        const uniqueKey = buildDeckUniqueKey({
          leaderCardNumber: LEADER_CARD_NUMBER,
          player: row.player,
          date: row.date,
          tournamentType: row.format,
          host: row.tournamentName,
          placementRaw: row.placementRaw,
        });

        const existing = await db.tournamentDeck.findUnique({ where: { uniqueKey } });
        if (existing) {
          skippedDuplicate++;
          continue;
        }

        // Deuxième requête (page de decklist individuelle) uniquement pour
        // les lignes réellement nouvelles — jamais pour un doublon déjà en
        // base, pour limiter le nombre de requêtes envoyées au site.
        const parsed = await scrapeLimitlessDecklist(row.listUrl);
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
            date: row.date,
            placementRaw: row.placementRaw,
            wins: placement.wins,
            losses: placement.losses,
            undefeated: placement.undefeated,
            status: placement.status,
            proofLevel: placement.proofLevel,
            tournamentType: row.format,
            host: row.tournamentName,
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
        errors.push({ row: row.player + " " + row.date, error: e.message ?? String(e) });
      }
    }

    await db.importLog.update({
      where: { id: log.id },
      data: {
        cardsFound: rows.length,
        cardsImported: created,
        cardsUpdated: 0,
        cardsSkipped: skippedDuplicate + errors.length,
        errors: JSON.stringify(errors),
        finishedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, totalRowsFound: rows.length, created, skippedDuplicate, needsReview, errors });
  } catch (e: any) {
    await db.importLog.update({
      where: { id: log.id },
      data: { errors: JSON.stringify([{ error: e.message ?? String(e) }]), finishedAt: new Date() },
    });
    return NextResponse.json({ ok: false, error: e.message ?? String(e) }, { status: 500 });
  }
}
