import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/learn — lit les articles déjà en base (remplis par
 * /api/learn/refresh), regroupés par source. Aucun appel réseau ici :
 * page rapide au chargement, l'utilisateur déclenche l'actualisation
 * lui-même via le bouton "Actualiser" (même principe que la tier list).
 */
interface LearnArticleRow {
  id: string;
  url: string;
  source: string;
  sourceLabel: string;
  title: string;
  summary: string | null;
  durationMinutes: number | null;
  publishedAt: Date | null;
  isPillar: boolean;
  order: number;
  capturedAt: Date;
}

export async function GET() {
  const articles: LearnArticleRow[] = await db.learnArticle.findMany({
    orderBy: [{ isPillar: "desc" }, { source: "asc" }, { order: "asc" }],
  });

  const capturedAt = articles.reduce<string | null>((max, a) => {
    const iso = a.capturedAt.toISOString();
    return !max || iso > max ? iso : max;
  }, null);

  return NextResponse.json({ ok: true, articles, capturedAt });
}
