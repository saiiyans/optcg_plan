import { NextRequest, NextResponse } from "next/server";
import { syncKaizokuMatches } from "@/lib/kaizokuSync";

export const dynamic = "force-dynamic";

/**
 * POST /api/matches/sync-kaizoku
 * Body: { rawText: string, mode?: "Simulateur" | "Boutique" }
 *
 * Import manuel par copier-coller depuis la page d'historique Kaizoku.
 * Voir src/lib/kaizokuSync.ts pour la logique de déduplication, partagée
 * avec la synchronisation automatique (/api/cron/sync-kaizoku).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawText: string = body?.rawText ?? "";
    const mode: "Simulateur" | "Boutique" = body?.mode === "Boutique" ? "Boutique" : "Simulateur";

    if (!rawText.trim()) {
      return NextResponse.json({ ok: false, error: "Texte vide." }, { status: 400 });
    }

    const summary = await syncKaizokuMatches(rawText, mode);
    return NextResponse.json({ ok: true, ...summary });
  } catch (e: any) {
    console.error("POST /api/matches/sync-kaizoku failed:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
