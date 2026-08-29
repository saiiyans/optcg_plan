import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { testLimitlessSample, LIMITLESS_ARCHETYPE_URL } from "@/lib/limitlessScraper";
import { checkSyncUrl } from "@/lib/importRouteHelpers";

/**
 * GET /api/tournament-decks/limitless/test3
 * Récupère UNIQUEMENT 3 résultats Mihawk depuis Limitless TCG (US /
 * International), parse leur decklist, vérifie 50 cartes, et affiche les
 * erreurs. N'écrit rien en base — c'est l'étape de vérification
 * obligatoire avant tout import complet, d'autant plus importante ici que
 * le parseur n'a pas pu être testé contre le HTML réel depuis cet
 * environnement (voir la note en tête de src/lib/limitlessScraper.ts).
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url") ?? LIMITLESS_ARCHETYPE_URL;
  const urlError = checkSyncUrl(url);
  if (urlError) return urlError;
  try {
    const result = await testLimitlessSample(url);
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message ?? String(e) }, { status: 500 });
  }
}
