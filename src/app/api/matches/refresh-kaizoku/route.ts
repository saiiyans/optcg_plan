import { NextResponse } from "next/server";
import { scrapeKaizokuText } from "@/lib/kaizokuScraper";
import { syncKaizokuMatches } from "@/lib/kaizokuSync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/matches/refresh-kaizoku
 *
 * Déclenchée par le bouton "Rafraîchir depuis mes parties" de l'onglet
 * Matchups (Prépa). Même logique que la synchronisation automatique
 * (/api/cron/sync-kaizoku), sans le secret partagé — appelée depuis
 * l'app elle-même, pas par un service externe.
 */
export async function POST() {
  try {
    const text = await scrapeKaizokuText();
    const summary = await syncKaizokuMatches(text, "Simulateur");
    return NextResponse.json({
      ok: true,
      ...summary,
      // Aide au diagnostic sans accès aux logs Vercel : si rien n'a été
      // reconnu, montre ce que la page a réellement renvoyé.
      ...(summary.parsed === 0 ? { debugTextLength: text.length, debugTextPreview: text.slice(0, 800) } : {}),
    });
  } catch (e: any) {
    console.error("POST /api/matches/refresh-kaizoku failed:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
