import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const COLOR_FR: Record<string, string> = {
  Red: "Rouge",
  Green: "Vert",
  Blue: "Bleu",
  Purple: "Violet",
  Black: "Noir",
  Yellow: "Jaune",
};

/** "Red", "Red/Green"... -> "Rouge", "Rouge/Vert" — traduit chaque couleur
 * séparément, dans l'ordre déjà présent en base, sans jamais réordonner. */
function formatColor(raw: string): string {
  return raw
    .split("/")
    .map((c) => COLOR_FR[c.trim()] ?? c.trim())
    .join("/");
}

/**
 * GET /api/leaders
 *
 * Liste tous les leaders réellement présents dans la bibliothèque de
 * cartes importée (category = "Leader") — source dynamique, se met à jour
 * toute seule à chaque nouveau set repéré par le scraper Limitless, sans
 * jamais avoir besoin de toucher au code (contrairement à la liste statique
 * OPPONENT_LEADERS de src/lib/planningData.ts, qui reste le repli utilisé
 * tant que cette route n'a pas répondu ou si la base est vide/inaccessible
 * — voir useOpponentLeaders(), qui combine les deux).
 *
 * Les réimpressions du même leader (nom + couleur identiques) dans
 * plusieurs sets sont regroupées sous une seule entrée — un leader ne doit
 * apparaître qu'une fois dans la liste, quel que soit son nombre de prints.
 */
export async function GET() {
  try {
    const leaders = await db.card.findMany({
      where: { category: "Leader" },
      select: { name: true, color: true },
      orderBy: { name: "asc" },
    });

    const seen = new Map<string, string>(); // "nom|couleur" -> libellé affiché
    for (const l of leaders) {
      const key = `${l.name}|${l.color}`;
      if (!seen.has(key)) seen.set(key, `${l.name} (${formatColor(l.color)})`);
    }

    const displayNames = Array.from(seen.values()).sort((a, b) => a.localeCompare(b, "fr"));
    return NextResponse.json({ ok: true, leaders: displayNames, count: displayNames.length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message ?? String(e) }, { status: 500 });
  }
}
