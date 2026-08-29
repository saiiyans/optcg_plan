import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAllowedSyncUrl } from "@/lib/adminAuth";

/**
 * Squelette commun aux 9 routes sync/import/test3 des 3 sources de
 * tournois (Asie/onepiecetopdecks.com, Limitless, OPTCG.gg — voir
 * src/lib/scraper.ts, src/lib/limitlessScraper.ts, src/lib/optcggScraper.ts).
 *
 * Les 3 sources renvoient des formats de ligne différents et deux systèmes
 * de classement de placement différents (classifyPlacement vs
 * classifyOptcggPlacement) — donc pas de fusion du scraping/mapping
 * lui-même, ça resterait moins lisible qu'utile. Ce fichier ne factorise
 * QUE le squelette identique répété dans chaque route : validation d'URL
 * (garde-fou SSRF), garde-fou confirm:true, et le cycle de vie ImportLog
 * (ouverture / clôture succès / clôture échec).
 */

/** Renvoie une NextResponse 400 si l'URL n'est pas dans la liste blanche (SSRF), sinon null. */
export function checkSyncUrl(url: string): NextResponse | null {
  if (!isAllowedSyncUrl(url)) {
    return NextResponse.json({ ok: false, error: "URL non autorisée — domaine hors liste blanche." }, { status: 400 });
  }
  return null;
}

/** Renvoie une NextResponse 400 si le body n'a pas confirm:true, sinon null. */
export function requireConfirm(body: unknown): NextResponse | null {
  if ((body as { confirm?: unknown } | null)?.confirm !== true) {
    return NextResponse.json({ ok: false, error: "Confirmation requise : envoie { confirm: true }." }, { status: 400 });
  }
  return null;
}

/** Ouvre un ImportLog "full_import" — même squelette pour les 3 routes d'import complet. */
export async function openImportLog(sourceUrl: string) {
  return db.importLog.create({
    data: { runType: "full_import", sourceUrl, cardsFound: 0, cardsImported: 0, cardsUpdated: 0, cardsSkipped: 0 },
  });
}

/** Referme un ImportLog avec le résultat final d'un import réussi. */
export async function closeImportLogSuccess(
  logId: string,
  data: { cardsFound: number; cardsImported: number; cardsUpdated?: number; cardsSkipped: number; errors: unknown }
) {
  await db.importLog.update({
    where: { id: logId },
    data: {
      cardsFound: data.cardsFound,
      cardsImported: data.cardsImported,
      cardsUpdated: data.cardsUpdated ?? 0,
      cardsSkipped: data.cardsSkipped,
      errors: JSON.stringify(data.errors),
      finishedAt: new Date(),
    },
  });
}

/** Referme un ImportLog après une erreur fatale (le scraping/parsing a levé une exception). */
export async function closeImportLogFailure(logId: string, error: unknown) {
  await db.importLog.update({
    where: { id: logId },
    data: {
      errors: JSON.stringify([{ error: error instanceof Error ? error.message : String(error) }]),
      finishedAt: new Date(),
    },
  });
}
