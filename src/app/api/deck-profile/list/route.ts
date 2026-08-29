import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/deck-profile/list
 * Liste tout ce qui peut être choisi dans le sélecteur de Deck Profile :
 * la référence Mihawk (statique, non listée ici — gérée côté client),
 * les decks personnels, et les decks gagnants sauvegardés dans Mes Decks.
 */
export async function GET() {
  // Annotations explicites nécessaires dans cet environnement de dev (client
  // Prisma généré localement "vide" — voir la note dans deckComposition.ts).
  const [personalDecks, savedTournamentDecks]: [
    { id: string; name: string; leaderCardNumber: string }[],
    { id: string; deckName: string; player: string; leaderCardNumber: string }[],
  ] = await Promise.all([
    db.deck.findMany({ orderBy: { updatedAt: "desc" } }),
    db.tournamentDeck.findMany({ where: { savedToMyDecks: true }, orderBy: { importedAt: "desc" } }),
  ]);

  return NextResponse.json({
    ok: true,
    personalDecks: personalDecks.map((d) => ({ id: d.id, name: d.name, leaderCardNumber: d.leaderCardNumber })),
    savedTournamentDecks: savedTournamentDecks.map((d) => ({ id: d.id, name: `${d.deckName} — ${d.player}`, leaderCardNumber: d.leaderCardNumber })),
  });
}
