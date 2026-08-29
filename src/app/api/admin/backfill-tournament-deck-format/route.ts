import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSecret } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/backfill-tournament-deck-format
 *
 * Correction ponctuelle (à lancer une fois) : avant le correctif du
 * 28/08/2026 sur /api/tournament-decks/import, le champ `format` de
 * TournamentDeck n'était jamais rempli explicitement à l'import et
 * retombait silencieusement sur le défaut Prisma "OP16" — y compris pour
 * les decks importés depuis la page OP17 après le changement de source.
 * Redérive `format` depuis `sourceUrl` (fiable : contient toujours "opNN"
 * en clair, que la source soit onepiecetopdecks.com ou Limitless) pour
 * TOUS les decks existants. Idempotent — ne touche que les decks dont le
 * format stocké diffère de celui redérivé, safe à relancer plusieurs fois.
 */
export async function POST(req: NextRequest) {
  const denied = requireAdminSecret(req);
  if (denied) return denied;

  const decks = await db.tournamentDeck.findMany({ select: { id: true, sourceUrl: true, format: true } });
  let updated = 0;
  const skippedNoFormatInUrl: string[] = [];

  for (const d of decks) {
    const m = d.sourceUrl.match(/\bop(\d{1,2})\b/i);
    if (!m) {
      skippedNoFormatInUrl.push(d.id);
      continue;
    }
    const correctFormat = `OP${m[1]}`;
    if (d.format !== correctFormat) {
      await db.tournamentDeck.update({ where: { id: d.id }, data: { format: correctFormat } });
      updated++;
    }
  }

  return NextResponse.json({ ok: true, checked: decks.length, updated, skippedNoFormatInUrl: skippedNoFormatInUrl.length });
}
