import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { listAllCardNumbers, scrapeCardDetail } from "@/lib/scraper";
import { computeMihawkRating } from "@/lib/mihawkRating";
import { isAllowedSyncUrl } from "@/lib/adminAuth";

const DEFAULT_SEARCH_URL =
  "https://onepiece.limitlesstcg.com/cards/?q=category%3Aleader%2Ccharacter%2Cevent%2Cstage%20color%3Agreen%20lang%3Aen%20display%3Agrid%20sort%3Aid";

/**
 * POST /api/import/confirm  { url?, confirm: true }
 *
 * Import complet. N'écrit RIEN si `confirm !== true` — c'est le garde-fou
 * qui matérialise "importe uniquement après ma confirmation" dans le cahier
 * des charges. Chaque carte déjà corrigée à la main (manuallyEditedFields
 * non vide) n'est jamais réécrite silencieusement : seuls les champs non
 * corrigés sont mis à jour.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (body.confirm !== true) {
    return NextResponse.json(
      { ok: false, error: "Confirmation requise : envoie { confirm: true } pour lancer l'import." },
      { status: 400 }
    );
  }

  const searchUrl = body.url ?? DEFAULT_SEARCH_URL;
  if (!isAllowedSyncUrl(searchUrl)) {
    return NextResponse.json({ ok: false, error: "URL non autorisée — domaine hors liste blanche." }, { status: 400 });
  }
  const log = await db.importLog.create({
    data: {
      runType: "full_import",
      sourceUrl: searchUrl,
      cardsFound: 0,
      cardsImported: 0,
      cardsUpdated: 0,
      cardsSkipped: 0,
    },
  });

  const errors: { cardNumber: string; error: string }[] = [];
  let imported = 0;
  let updated = 0;
  let skipped = 0;

  try {
    const { cardNumbers, totalFoundOnSite } = await listAllCardNumbers(searchUrl);

    for (const cardNumber of cardNumbers) {
      try {
        const existing = await db.card.findUnique({ where: { cardNumber } });
        const lockedFields: string[] = existing?.manuallyEditedFields
          ? JSON.parse(existing.manuallyEditedFields)
          : [];

        const scraped = await scrapeCardDetail(cardNumber);

        const data: Record<string, any> = {
          name: scraped.name,
          category: scraped.category,
          color: scraped.color,
          setCode: scraped.setCode,
          rarity: scraped.rarity,
          cost: scraped.cost,
          power: scraped.power,
          counter: scraped.counter,
          attribute: scraped.attribute,
          types: scraped.types,
          officialText: scraped.officialText,
          triggerText: scraped.triggerText,
          imageUrl: scraped.imageUrl,
          cardUrl: scraped.cardUrl,
          sourceUrl: searchUrl,
          legalityStatus: scraped.legalityStatus,
          block: scraped.block,
          language: scraped.language,
        };
        // Ne jamais réécrire un champ que l'utilisateur a corrigé à la main.
        for (const field of lockedFields) delete data[field];

        if (existing) {
          await db.card.update({ where: { cardNumber }, data });
          updated++;
        } else {
          await db.card.create({ data: { cardNumber, ...data } as any });
          imported++;
        }

        const card = await db.card.findUniqueOrThrow({ where: { cardNumber } });
        // Shanks OP17 retiré : le joueur ne le jouera finalement pas au
        // tournoi, plus besoin de calculer une note pour ce leader à chaque
        // import de carte.
        const ratingsToCompute = [
          { leaderContext: "Mihawk OP14-020", rating: computeMihawkRating(scraped) },
        ];
        for (const { leaderContext, rating } of ratingsToCompute) {
          const existingRating = await db.personalRating.findUnique({
            where: { cardId_leaderContext: { cardId: card.id, leaderContext } },
          });
          if (!existingRating || !existingRating.isManualOverride) {
            await db.personalRating.upsert({
              where: { cardId_leaderContext: { cardId: card.id, leaderContext } },
              update: {
                stars: rating.autoStars,
                autoStars: rating.autoStars,
                justification: rating.justification,
                confidence: rating.confidence,
                recommendedCount: rating.recommendedCount,
              },
              create: {
                cardId: card.id,
                leaderContext,
                stars: rating.autoStars,
                autoStars: rating.autoStars,
                justification: rating.justification,
                confidence: rating.confidence,
                recommendedCount: rating.recommendedCount,
              },
            });
          }
        }
      } catch (e: any) {
        skipped++;
        errors.push({ cardNumber, error: e.message ?? String(e) });
      }
    }

    await db.importLog.update({
      where: { id: log.id },
      data: {
        cardsFound: totalFoundOnSite,
        cardsImported: imported,
        cardsUpdated: updated,
        cardsSkipped: skipped,
        errors: JSON.stringify(errors),
        finishedAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      totalFoundOnSite,
      imported,
      updated,
      skipped,
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
