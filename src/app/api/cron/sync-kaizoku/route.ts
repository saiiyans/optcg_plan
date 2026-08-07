import { NextRequest, NextResponse } from "next/server";
import { scrapeKaizokuText } from "@/lib/kaizokuScraper";
import { syncKaizokuMatches } from "@/lib/kaizokuSync";

export const dynamic = "force-dynamic";
// Ouvrir un vrai navigateur + laisser React se rendre prend plusieurs
// secondes. 60s couvre large (Hobby: max via cette config ; Pro: jusqu'à
// 300s si jamais besoin de plus).
export const maxDuration = 60;

/**
 * GET /api/cron/sync-kaizoku
 *
 * Déclenchée par :
 * - GitHub Actions (.github/workflows/sync-kaizoku.yml), toutes les 30 min
 * - Le Cron Vercel de secours (vercel.json), une fois par jour
 *
 * Protégée par un secret partagé (Authorization: Bearer <CRON_SECRET>) —
 * sans lui, n'importe qui pourrait déclencher un scraping à répétition.
 * (Le bouton manuel dans l'onglet Matchups utilise une route à part,
 * /api/matches/refresh-kaizoku, sans ce secret puisqu'il vient de l'app
 * elle-même.)
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Non autorisé." }, { status: 401 });
  }

  try {
    const text = await scrapeKaizokuText();
    const summary = await syncKaizokuMatches(text, "Simulateur");
    return NextResponse.json({ ok: true, ...summary, triggeredBy: req.headers.get("x-vercel-cron-schedule") ? "vercel-cron" : "external" });
  } catch (e: any) {
    console.error("GET /api/cron/sync-kaizoku failed:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
