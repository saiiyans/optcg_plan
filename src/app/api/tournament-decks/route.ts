import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { getLeader } from "@/lib/leaders";

// Le champ `date` de TournamentDeck est le texte brut récupéré sur
// onepiecetopdecks.com au format "M/J/AAAA" (mois d'abord, sans zéro
// initial — ex. "8/25/2026"), jamais normalisé en ISO. Un `orderBy: { date:
// "desc" }` Prisma sur une colonne texte trie ALPHABÉTIQUEMENT, pas
// chronologiquement : "8/25/2026" passe avant "8/4/2026" parce que '2' < '4'
// en comparaison de caractères — c'est exactement le classement mélangé
// observé sur /decks. On retrie donc ici en JS après coup, en reparsant
// chaque date en vrai timestamp, sans jamais faire planter la page sur une
// date mal formée (repli sur 0, la classant en dernier plutôt que de
// planter).
function parseUsDate(raw: string): number {
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : 0;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status"); // winner | top_performer | unverified
  const undefeatedOnly = sp.get("undefeated") === "true";
  const country = sp.get("country");
  const player = sp.get("player");
  const includesCard = sp.get("includesCard");
  const excludesCard = sp.get("excludesCard");
  const savedOnly = sp.get("saved") === "true";
  const leader = getLeader(sp.get("leader"));

  const decks = await db.tournamentDeck.findMany({
    where: {
      deckProfile: leader.deckProfile,
      ...(status ? { status } : {}),
      ...(undefeatedOnly ? { undefeated: true } : {}),
      ...(country ? { country: { contains: country, mode: "insensitive" } } : {}),
      ...(player ? { player: { contains: player, mode: "insensitive" } } : {}),
      ...(savedOnly ? { savedToMyDecks: true } : {}),
    },
    include: { cards: true },
    // Pré-tri par date d'import — sert uniquement de départage stable pour
    // les decks à date identique une fois retriés chronologiquement
    // ci-dessous (Array.sort est stable), pas le tri final affiché.
    orderBy: { createdAt: "desc" },
  });

  let result = decks;
  if (includesCard) result = result.filter((d) => d.cards.some((c) => c.cardNumber === includesCard.toUpperCase()));
  if (excludesCard) result = result.filter((d) => !d.cards.some((c) => c.cardNumber === excludesCard.toUpperCase()));

  // Tri chronologique réel (le plus récent d'abord), pas le tri
  // alphabétique erroné qu'aurait donné Prisma sur le champ texte — voir
  // parseUsDate ci-dessus.
  result = [...result].sort((a, b) => parseUsDate(b.date) - parseUsDate(a.date));

  return NextResponse.json({ ok: true, count: result.length, decks: result });
}
