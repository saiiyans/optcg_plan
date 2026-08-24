import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/matches/:id — une partie + son historique complet d'analyses
// du coach (toutes les lignes CoachInsight liées, jamais une seule :
// chaque régénération garde la précédente, voir defeatAnalysis.ts).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const match = await db.match.findUnique({
    where: { id: params.id },
    include: { insights: { orderBy: { createdAt: "desc" } } },
  });
  if (!match) return NextResponse.json({ ok: false, error: "Partie introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true, match });
}

// Liste blanche des champs modifiables après coup — jamais l'id, jamais
// kaizokuId (clé de déduplication de l'import), jamais createdAt.
// "Ma raison initiale" (lossReason) fait partie de cette liste : c'est le
// joueur qui la modifie ici, jamais l'analyse automatique.
const EDITABLE_FIELDS = [
  "date", "mode", "myDeck", "opponentLeader", "result", "cardsToWatch", "notes",
  "turnOrder", "mulligan", "openingHandQuality", "mainMistake", "mistakesJson", "mostUsefulCard", "uselessCard", "keyTurn",
  "confidence", "donRecoveredUnused", "cardsInHandEnd", "opponentLifeRemaining", "gameDurationMinutes",
  "mihawkActivations", "mihawkEffectForgotten", "mihawkEffectTooEarly", "firstCost5Turn", "decisiveMoment",
  "inspiredByDeckId", "lossReason", "whatCouldHaveDoneDifferently", "openingHandKeyCards", "boardStateAtCritical", "myLifeRemaining",
  // Section 1/15 — reclassification manuelle de la phase (correction d'une
  // erreur de saisie), qualité de décision / lecture du résultat.
  "trainingPhase", "decisionQuality", "resultReading",
] as const;

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      data[field] = body[field];
    }
  }

  // deckId est traité à part : quand il change, on recalcule TOUJOURS
  // deckVersionNumber/deckNameAtLog côté serveur (jamais fournis par le
  // client) pour garder un instantané fiable — voir POST /api/matches.
  if (Object.prototype.hasOwnProperty.call(body, "deckId")) {
    const deckId: string | null = body.deckId || null;
    data.deckId = deckId;
    if (deckId) {
      const deck = await db.deck.findUnique({ where: { id: deckId } });
      if (deck) {
        const archivedCount = await db.deckVersion.count({ where: { deckId } });
        data.deckVersionNumber = archivedCount + 1;
        data.deckNameAtLog = deck.name;
      } else {
        data.deckVersionNumber = null;
        data.deckNameAtLog = null;
      }
    } else {
      data.deckVersionNumber = null;
      data.deckNameAtLog = null;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: false, error: "Aucun champ modifiable fourni." }, { status: 400 });
  }
  try {
    const match = await db.match.update({ where: { id: params.id }, data });
    return NextResponse.json({ ok: true, match });
  } catch (e: any) {
    console.error("PATCH /api/matches/:id failed:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}

// Suppression douce (section 18) — ne supprime jamais réellement la ligne
// depuis l'app : pose juste deletedAt, ce qui la fait disparaître de toutes
// les listes/statistiques immédiatement, tout en permettant un "annuler"
// via POST /api/matches/:id/restore juste après.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const match = await db.match.update({ where: { id: params.id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true, match });
}
