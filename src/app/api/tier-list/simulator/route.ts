import { NextResponse } from "next/server";
import { fetchCardKaizokuTierList } from "@/lib/cardKaizokuTierScraper";

export const dynamic = "force-dynamic";

/**
 * GET /api/tier-list/simulator
 *
 * Tier list "simulateur" (Card D. Kaizoku, taux de victoire réel — voir
 * cardKaizokuTierScraper.ts). Volontairement SANS stockage en base,
 * contrairement à /api/meta-matchups : la source ici est déjà un fichier
 * JSON statique généré à l'avance par cardkaizoku.com et servi par leur
 * CDN (pas une page recalculée à chaque visite) — la relire à chaque
 * chargement de page ne leur ajoute donc pas de charge supplémentaire,
 * inutile de dupliquer cette donnée dans notre propre base.
 *
 * Cette route reste GET simple (pas de bouton "Actualiser" séparé) — le
 * frontend la rappelle simplement quand l'utilisateur veut rafraîchir.
 */
export async function GET() {
  try {
    const result = await fetchCardKaizokuTierList();
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 200 });
  }
}
