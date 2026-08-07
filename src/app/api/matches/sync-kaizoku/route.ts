import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseKaizokuText } from "@/lib/kaizokuParser";

export const dynamic = "force-dynamic";

/**
 * POST /api/matches/sync-kaizoku
 * Body: { rawText: string, mode?: "Simulateur" | "Boutique" }
 *
 * Parse le texte collé depuis Card D. Kaizoku, ignore les parties déjà
 * importées (via kaizokuId, unique en base), insère le reste. Toujours
 * idempotent : relancer avec le même texte (ou un texte qui le recouvre
 * partiellement, ex. "page 1" rechargée) ne crée jamais de doublon.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawText: string = body?.rawText ?? "";
    const mode: string = body?.mode === "Boutique" ? "Boutique" : "Simulateur";

    if (!rawText.trim()) {
      return NextResponse.json({ ok: false, error: "Texte vide." }, { status: 400 });
    }

    const { matches, warnings } = parseKaizokuText(rawText);

    if (matches.length === 0) {
      return NextResponse.json({ ok: true, inserted: 0, skipped: 0, parsed: 0, warnings });
    }

    const existing = await db.match.findMany({
      where: { kaizokuId: { in: matches.map((m) => m.kaizokuId) } },
      select: { kaizokuId: true },
    });
    const existingIds = new Set(existing.map((e) => e.kaizokuId));

    const toInsert = matches.filter((m) => !existingIds.has(m.kaizokuId));

    if (toInsert.length > 0) {
      await db.match.createMany({
        data: toInsert.map((m) => ({
          date: m.date,
          mode,
          myDeck: m.myDeck,
          opponentLeader: m.opponentLeader,
          result: m.result,
          notes: `Importé depuis Card D. Kaizoku — ${m.time}`,
          kaizokuId: m.kaizokuId,
        })),
      });
    }

    return NextResponse.json({
      ok: true,
      parsed: matches.length,
      inserted: toInsert.length,
      skipped: matches.length - toInsert.length,
      warnings,
    });
  } catch (e: any) {
    console.error("POST /api/matches/sync-kaizoku failed:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
