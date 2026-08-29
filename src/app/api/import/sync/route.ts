import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { listAllCardNumbers } from "@/lib/scraper";
import { isAllowedSyncUrl } from "@/lib/adminAuth";

const DEFAULT_SEARCH_URL =
  "https://onepiece.limitlesstcg.com/cards/?q=category%3Aleader%2Ccharacter%2Cevent%2Cstage%20color%3Agreen%20lang%3Aen%20display%3Agrid%20sort%3Aid";

/**
 * POST /api/import/sync
 * Bouton "Synchroniser les cartes vertes" : ne recense QUE les numéros de
 * carte absents de la base (nouvelles cartes). Ne touche à aucune carte
 * déjà importée — pour une mise à jour complète des cartes existantes,
 * utilise /api/import/confirm qui respecte les verrous manuels.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const searchUrl = body.url ?? DEFAULT_SEARCH_URL;
  if (!isAllowedSyncUrl(searchUrl)) {
    return NextResponse.json({ ok: false, error: "URL non autorisée — domaine hors liste blanche." }, { status: 400 });
  }

  const log = await db.importLog.create({
    data: { runType: "sync", sourceUrl: searchUrl, cardsFound: 0, cardsImported: 0, cardsUpdated: 0, cardsSkipped: 0 },
  });

  try {
    const { cardNumbers, totalFoundOnSite } = await listAllCardNumbers(searchUrl);
    // Annotation explicite nécessaire dans cet environnement de dev (client
    // Prisma généré localement "vide" — voir la note dans deckComposition.ts).
    const existingCards: { cardNumber: string }[] = await db.card.findMany({ select: { cardNumber: true } });
    const existingNumbers = new Set(existingCards.map((c) => c.cardNumber));
    const newNumbers = cardNumbers.filter((n) => !existingNumbers.has(n));

    await db.importLog.update({
      where: { id: log.id },
      data: { cardsFound: totalFoundOnSite, finishedAt: new Date() },
    });

    return NextResponse.json({
      ok: true,
      totalFoundOnSite,
      alreadyInDb: existingNumbers.size,
      newCardsDetected: newNumbers.length,
      newCardNumbers: newNumbers,
      note: "Aperçu uniquement — appelle /api/import/confirm avec confirm:true pour importer ces nouvelles cartes.",
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message ?? String(e) }, { status: 500 });
  }
}
