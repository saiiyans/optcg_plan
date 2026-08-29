import { NextRequest, NextResponse } from "next/server";

// Sans ceci, Next.js peut mettre en cache la réponse de cette route et
// renvoyer indéfiniment le même résultat, même après une correction du
// scraper ou un nouveau déploiement — cette route scrape un site externe
// en direct, elle ne doit jamais être servie depuis un cache.
export const dynamic = "force-dynamic";
import { listAllCardNumbers, testScrapeSample } from "@/lib/scraper";
import { isAllowedSyncUrl } from "@/lib/adminAuth";

const DEFAULT_SEARCH_URL =
  "https://onepiece.limitlesstcg.com/cards/?q=category%3Aleader%2Ccharacter%2Cevent%2Cstage%20color%3Agreen%20lang%3Aen%20display%3Agrid%20sort%3Aid";

/**
 * GET /api/import/preview?mode=count      -> compte juste le nombre de cartes trouvées
 * GET /api/import/preview?mode=test5      -> teste l'import complet sur 5 cartes réelles
 * Aucune écriture en base dans cette route — c'est un aperçu, jamais un import.
 */
export async function GET(req: NextRequest) {
  const searchUrl = req.nextUrl.searchParams.get("url") ?? DEFAULT_SEARCH_URL;
  const mode = req.nextUrl.searchParams.get("mode") ?? "count";
  if (!isAllowedSyncUrl(searchUrl)) {
    return NextResponse.json({ ok: false, error: "URL non autorisée — domaine hors liste blanche." }, { status: 400 });
  }

  try {
    if (mode === "test5") {
      const result = await testScrapeSample(searchUrl, 5);
      return NextResponse.json({ ok: true, ...result });
    }

    const { cardNumbers, totalFoundOnSite } = await listAllCardNumbers(searchUrl);
    return NextResponse.json({
      ok: true,
      totalFoundOnSite,
      totalCollected: cardNumbers.length,
      matches: totalFoundOnSite === cardNumbers.length,
      sampleNumbers: cardNumbers.slice(0, 10),
      allNumbers: cardNumbers,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message ?? String(e) }, { status: 500 });
  }
}
