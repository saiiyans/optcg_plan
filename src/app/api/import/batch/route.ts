import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scrapeCardDetail } from "@/lib/scraper";
import { computeMihawkRating } from "@/lib/mihawkRating";
import { computeShanksRating } from "@/lib/shanksRating";

/**
 * POST /api/import/batch  { numbers: string[], sourceUrl, logId?, finish? }
 *
 * Traite un petit lot de numéros de carte (l'appelant découpe lui-même la
 * liste complète en paquets côté client). Chaque appel reste rapide, ce qui
 * évite de dépasser la limite de temps d'exécution d'une fonction Vercel —
 * contrairement à /api/import/confirm qui traite tout en une seule requête
 * et se fait couper avant la fin sur un gros volume de cartes.
 *
 * logId permet de cumuler les compteurs dans un seul ImportLog à travers
 * plusieurs appels successifs plutôt que d'en créer un par lot.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { numbers, sourceUrl, logId: incomingLogId, finish } = body;

  if (!Array.isArray(numbers) || numbers.length === 0) {
    return NextResponse.json({ ok: false, error: "numbers (tableau non vide) requis." }, { status: 400 });
  }

  let logId = incomingLogId;
  if (!logId) {
    const log = await db.importLog.create({
      data: { runType: "full_import", sourceUrl: sourceUrl ?? "", cardsFound: 0, cardsImported: 0, cardsUpdated: 0, cardsSkipped: 0 },
    });
    logId = log.id;
  }

  const errors: { cardNumber: string; error: string }[] = [];
  const conflicts: { cardNumber: string; existingName: string; scrapedName: string }[] = [];
  let imported = 0;
  let updated = 0;
  let skipped = 0;

  // Normalisation légère pour comparer deux noms sans faux positifs sur la
  // casse/ponctuation (ex. "Monkey.D.Luffy" vs "Monkey D. Luffy").
  function normalizeName(n: string): string {
    return n.toLowerCase().replace(/[.\s]+/g, "");
  }

  for (const cardNumber of numbers) {
    try {
      const existing = await db.card.findUnique({ where: { cardNumber } });
      const lockedFields: string[] = existing?.manuallyEditedFields ? JSON.parse(existing.manuallyEditedFields) : [];

      const scraped = await scrapeCardDetail(cardNumber);

      // Garde-fou explicite : le numéro de carte est la seule clé fiable,
      // jamais le nom. Si le nom scrapé diverge fortement du nom déjà en
      // base pour ce même numéro, on bloque la mise à jour de cette carte
      // et on remonte le conflit — plutôt que d'écraser silencieusement une
      // donnée peut-être correcte par une donnée peut-être erronée.
      if (existing && existing.name && scraped.name && normalizeName(existing.name) !== normalizeName(scraped.name)) {
        skipped++;
        conflicts.push({ cardNumber, existingName: existing.name, scrapedName: scraped.name });
        continue;
      }

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
        sourceUrl: sourceUrl ?? "",
        legalityStatus: scraped.legalityStatus,
        block: scraped.block,
        language: scraped.language,
      };
      for (const field of lockedFields) delete data[field];

      if (existing) {
        await db.card.update({ where: { cardNumber }, data });
        updated++;
      } else {
        await db.card.create({ data: { cardNumber, ...data } as any });
        imported++;
      }

      const card = await db.card.findUniqueOrThrow({ where: { cardNumber } });
      const ratingsToCompute = [
        { leaderContext: "Mihawk OP14-020", rating: computeMihawkRating(scraped) },
        { leaderContext: "Shanks OP17", rating: computeShanksRating(scraped) },
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

  const conflictsAsErrors = conflicts.map((c) => ({
    cardNumber: c.cardNumber,
    error: `⚠ Conflit nom/numéro — base="${c.existingName}" vs scrapé="${c.scrapedName}" — mise à jour bloquée, à vérifier manuellement.`,
  }));
  const allErrors = [...errors, ...conflictsAsErrors];

  const log = await db.importLog.findUnique({ where: { id: logId } });
  const prevErrors = log?.errors ? JSON.parse(log.errors) : [];
  await db.importLog.update({
    where: { id: logId },
    data: {
      cardsImported: (log?.cardsImported ?? 0) + imported,
      cardsUpdated: (log?.cardsUpdated ?? 0) + updated,
      cardsSkipped: (log?.cardsSkipped ?? 0) + skipped,
      errors: JSON.stringify([...prevErrors, ...allErrors]),
      ...(finish ? { finishedAt: new Date() } : {}),
    },
  });

  return NextResponse.json({ ok: true, logId, imported, updated, skipped, errors: allErrors, conflicts });
}
