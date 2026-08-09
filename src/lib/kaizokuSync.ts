import { db } from "./db";
import { parseKaizokuText } from "./kaizokuParser";
import { resolveOpponentLeaderId } from "./leaderNormalization";

export interface KaizokuSyncSummary {
  parsed: number;
  inserted: number;
  skipped: number;
  warnings: string[];
}

/**
 * Logique de synchronisation partagée entre :
 * - l'import manuel par copier-coller (/api/matches/sync-kaizoku, POST)
 * - la synchronisation automatique (/api/cron/sync-kaizoku, GET, via
 *   GitHub Actions ou le Cron Vercel de secours)
 *
 * Parse le texte, ignore les parties déjà connues (kaizokuId, unique en
 * base), insère le reste. Idempotent : rappeler avec un texte qui recouvre
 * partiellement un appel précédent ne crée jamais de doublon.
 */
export async function syncKaizokuMatches(
  rawText: string,
  mode: "Simulateur" | "Boutique" = "Simulateur"
): Promise<KaizokuSyncSummary> {
  const { matches, warnings } = parseKaizokuText(rawText);

  if (matches.length === 0) {
    return { parsed: 0, inserted: 0, skipped: 0, warnings };
  }

  const existing = await db.match.findMany({
    where: { kaizokuId: { in: matches.map((m) => m.kaizokuId) } },
    select: { kaizokuId: true },
  });
  const existingIds = new Set(existing.map((e) => e.kaizokuId));
  const toInsert = matches.filter((m) => !existingIds.has(m.kaizokuId));

  if (toInsert.length > 0) {
    for (const m of toInsert) {
      let opponentLeaderId: string | null = null;
      try {
        opponentLeaderId = await resolveOpponentLeaderId(m.opponentLeader);
      } catch (e) {
        console.error("resolveOpponentLeaderId failed (sync Kaizoku):", e);
      }
      await db.match.create({
        data: {
          date: m.date,
          mode,
          myDeck: m.myDeck,
          opponentLeader: m.opponentLeader,
          opponentLeaderId,
          result: m.result,
          notes: `Importé depuis Card D. Kaizoku — ${m.time}`,
          kaizokuId: m.kaizokuId,
        },
      });
    }
  }

  return {
    parsed: matches.length,
    inserted: toInsert.length,
    skipped: matches.length - toInsert.length,
    warnings,
  };
}
