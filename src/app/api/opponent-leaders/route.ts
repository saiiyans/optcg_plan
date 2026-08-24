import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { suggestLeaderMerges, type LeaderSummary } from "@/lib/leaderMerge";

export const dynamic = "force-dynamic";

/**
 * GET /api/opponent-leaders — toutes les fiches OpponentLeader avec leur
 * nombre de parties liées, plus des suggestions de fusion (jamais
 * appliquées automatiquement — section 11 : les cas ambigus vont dans un
 * outil de revue manuelle, ce endpoint alimente exactement cet outil).
 */
export async function GET() {
  const leaders = await db.opponentLeader.findMany({
    orderBy: { displayName: "asc" },
    include: { _count: { select: { matches: true } } },
  });

  const summaries: LeaderSummary[] = leaders.map(
    (l: { id: string; displayName: string; rawNames: string; _count: { matches: number } }) => ({
      id: l.id,
      displayName: l.displayName,
      rawNames: JSON.parse(l.rawNames || "[]"),
      matchCount: l._count.matches,
    })
  );

  const suggestions = suggestLeaderMerges(summaries);

  return NextResponse.json({
    ok: true,
    leaders: leaders.map((l: any) => ({
      id: l.id,
      displayName: l.displayName,
      cardNumber: l.cardNumber,
      color: l.color,
      rawNames: JSON.parse(l.rawNames || "[]"),
      matchCount: l._count.matches,
    })),
    suggestions: suggestions.map((s) => ({ aId: s.a.id, bId: s.b.id, reason: s.reason })),
  });
}
