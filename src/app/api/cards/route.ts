import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { findDeckQuantity, MIHAWK_REFERENCE_DECK } from "@/lib/deckReference";
import { getLeader } from "@/lib/leaders";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 60;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const category = sp.get("category");
  const setCode = sp.get("set");
  const attribute = sp.get("attribute");
  const counterFilter = sp.get("counter");
  const maxCost = sp.get("maxCost");
  const minStars = sp.get("minStars");
  const inDeckOnly = sp.get("inDeckOnly") === "true";
  const query = sp.get("q")?.trim();
  const reviewed = sp.get("reviewed"); // "true" | "false" | null
  const leader = getLeader(sp.get("leader"));
  const limit = Math.min(parseInt(sp.get("limit") ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE, 200);
  const offset = Math.max(parseInt(sp.get("offset") ?? "0", 10) || 0, 0);

  const where: Record<string, any> = { color: { contains: "Green", mode: "insensitive" } };
  if (category) where.category = category;
  if (setCode) where.setCode = { contains: setCode, mode: "insensitive" };
  if (attribute) where.attribute = attribute;
  if (maxCost) where.cost = { lte: parseInt(maxCost, 10) };
  if (counterFilter === "2000") where.counter = { gte: 2000 };
  if (counterFilter === "1000") where.counter = { gte: 1000, lt: 2000 };
  if (counterFilter === "none") where.OR = [{ counter: 0 }, { counter: null }];
  if (query) {
    where.AND = [
      {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { cardNumber: { contains: query, mode: "insensitive" } },
          { officialText: { contains: query, mode: "insensitive" } },
          { types: { contains: query, mode: "insensitive" } },
        ],
      },
    ];
  }
  if (reviewed === "true") where.coachReviewed = true;
  if (reviewed === "false") where.coachReviewed = false;
  // Filtre étoiles appliqué au niveau base de données (jointure sur la note
  // du leader choisi) — indispensable pour que la pagination reste correcte.
  if (minStars) {
    where.ratings = { some: { leaderContext: leader.leaderContext, stars: { gte: parseFloat(minStars) } } };
  }
  // "Dans mon deck" n'a de sens que pour Mihawk (seul deck de référence
  // codé pour l'instant) — filtré via la liste de numéros connue, au
  // niveau base de données pour la même raison.
  if (inDeckOnly && leader.key === "mihawk") {
    where.cardNumber = { in: MIHAWK_REFERENCE_DECK.cards.map((c) => c.cardNumber) };
  } else if (inDeckOnly) {
    where.cardNumber = { in: [] }; // aucun deck de référence pour ce leader -> aucun résultat, jamais une erreur
  }

  try {
    const [total, cards] = await Promise.all([
      db.card.count({ where }),
      db.card.findMany({
        where,
        include: { ratings: { where: { leaderContext: leader.leaderContext } } },
        orderBy: { cardNumber: "asc" },
        skip: offset,
        take: limit,
      }),
    ]);

    const result = cards.map((c: (typeof cards)[number]) => ({
      ...c,
      rating: c.ratings[0] ?? null,
      deckQuantity: leader.key === "mihawk" ? findDeckQuantity(c.cardNumber) : 0,
    }));

    return NextResponse.json({
      ok: true,
      count: result.length,
      total,
      hasMore: offset + result.length < total,
      cards: result,
    });
  } catch (e: any) {
    // Sans ce catch, une erreur Prisma (ex. DATABASE_URL absente/invalide sur
    // Vercel, base injoignable) faisait planter la route avec un corps 500
    // vide — le client crashait alors sur "Unexpected end of JSON input" au
    // lieu d'afficher un message compréhensible. Le message d'erreur réel
    // aide à distinguer "base non connectée" de "base vide" de tout autre cas.
    console.error("GET /api/cards failed:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e), cards: [], total: 0, count: 0, hasMore: false },
      { status: 500 }
    );
  }
}
