import { NextRequest, NextResponse } from "next/server";
import { listCardNumbersForSet } from "@/lib/scraper";

export const dynamic = "force-dynamic";

const SET_CODE_RE = /^[A-Z0-9]{2,10}$/i;

/**
 * GET /api/import/preview-set?set=OP17
 *
 * Aperçu de l'import d'UN SET COMPLET, toutes couleurs confondues — voir
 * listCardNumbersForSet() dans scraper.ts. Beaucoup plus rapide que
 * l'aperçu par couleur (/api/import/preview) juste après la sortie d'un
 * nouveau set : pas besoin d'attendre un import complet des 6 couleurs
 * (qui balaie aussi tous les anciens sets) pour rendre ce set disponible.
 * Aucune écriture en base ici — combiné ensuite avec /api/import/batch,
 * exactement comme le flux d'import par couleur.
 */
export async function GET(req: NextRequest) {
  const setCode = (req.nextUrl.searchParams.get("set") ?? "").trim().toUpperCase();
  if (!SET_CODE_RE.test(setCode)) {
    return NextResponse.json({ ok: false, error: "Paramètre 'set' requis (ex. OP17), alphanumérique." }, { status: 400 });
  }

  try {
    const { cardNumbers, totalFoundOnSite } = await listCardNumbersForSet(setCode);
    return NextResponse.json({
      ok: true,
      setCode,
      totalFoundOnSite,
      totalCollected: cardNumbers.length,
      allNumbers: cardNumbers,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message ?? String(e) }, { status: 500 });
  }
}
