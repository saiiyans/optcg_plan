import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Champs modifiables à la main — jamais officialText (texte officiel
// anglais scrapé), qui doit rester fidèle à la vraie carte.
const EDITABLE_FIELDS = [
  "officialTextFr",
  "coachExplanationFr",
  "mihawkAnalysisFr",
  "opponentMatchupNote",
] as const;
type EditableField = (typeof EDITABLE_FIELDS)[number];

/**
 * PATCH /api/cards/[cardNumber]/text
 * body: { field: "officialTextFr" | "coachExplanationFr" | "mihawkAnalysisFr" | "opponentMatchupNote", value: string }
 *
 * Permet d'écrire/corriger à la main la traduction et les explications
 * Coach d'une carte, en plus de (ou à la place de) la génération
 * automatique. Ne touche jamais officialText (texte officiel anglais),
 * name, effets, couleur, image ou tout autre champ protégé.
 */
export async function PATCH(req: NextRequest, { params }: { params: { cardNumber: string } }) {
  const body = await req.json().catch(() => ({}));
  const { field, value } = body;

  if (!EDITABLE_FIELDS.includes(field)) {
    return NextResponse.json(
      { ok: false, error: `Champ non modifiable : ${field}. Autorisés : ${EDITABLE_FIELDS.join(", ")}.` },
      { status: 400 }
    );
  }
  if (typeof value !== "string") {
    return NextResponse.json({ ok: false, error: "value doit être une chaîne de caractères." }, { status: 400 });
  }

  const card = await db.card.findUnique({ where: { cardNumber: params.cardNumber.toUpperCase() } });
  if (!card) {
    return NextResponse.json({ ok: false, error: "Carte introuvable." }, { status: 404 });
  }

  const updated = await db.card.update({
    where: { id: card.id },
    data: {
      [field as EditableField]: value.trim() || null,
      // Une modification manuelle vaut "revue" — l'app arrête d'afficher
      // "à venir" pour cette carte.
      coachReviewed: true,
    },
  });

  return NextResponse.json({ ok: true, card: { cardNumber: updated.cardNumber, [field]: updated[field as EditableField] } });
}
