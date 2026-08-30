import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  fetchOpDecksLearnArticles,
  fetchTcgProtectorsLearnArticles,
  fetchShonenTcgLearnArticles,
  type LearnArticleRaw,
  type LearnSource,
} from "@/lib/learnScraper";

export const dynamic = "force-dynamic";

/**
 * POST /api/learn/refresh — relit EN DIRECT les 3 sources de la rubrique
 * Apprentissage et met la base à jour. Chaque source est indépendante :
 * si l'une échoue (site injoignable, structure changée), les articles
 * déjà en base pour CETTE source restent affichés tels quels — jamais
 * silencieusement vidés — et seule son erreur remonte au frontend, les
 * deux autres sources s'actualisent normalement (même principe que
 * /api/meta-matchups/refresh et /api/tier-list/auto-classify).
 *
 * Les articles "pilier" (isPillar=true, désignés par le joueur comme base
 * de la méthodologie du coach) ne sont jamais supprimés, même si une
 * récupération réussie d'opdecks.xyz ne les retrouve pas cette fois-ci.
 */
interface LearnArticleUrlRow {
  url: string;
}

interface LearnArticleExistingRow {
  title: string;
  summary: string | null;
}

interface SourceRefreshResult {
  source: LearnSource;
  ok: boolean;
  count: number;
  error: string | null;
}

async function refreshSource(source: LearnSource, fetcher: () => Promise<LearnArticleRaw[]>): Promise<SourceRefreshResult> {
  let articles: LearnArticleRaw[];
  try {
    articles = await fetcher();
  } catch (e: any) {
    return { source, ok: false, count: 0, error: e?.message ?? String(e) };
  }

  const currentUrls = new Set(articles.map((a) => a.url));

  // Nettoyage des anciennes entrées de cette source qui ont disparu de la
  // liste actuelle — jamais un article "pilier".
  const existing: LearnArticleUrlRow[] = await db.learnArticle.findMany({
    where: { source, isPillar: false },
    select: { url: true },
  });
  for (const row of existing) {
    if (!currentUrls.has(row.url)) {
      await db.learnArticle.delete({ where: { url: row.url } });
    }
  }

  for (const a of articles) {
    // Si le titre/résumé anglais a changé depuis la dernière fois, la
    // traduction française stockée (titleFr/summaryFr) ne correspond plus
    // au texte source — on la vide pour que /api/admin/learn-translate la
    // regénère au prochain passage, plutôt que de laisser une traduction
    // d'un ancien texte affichée à côté du nouveau texte anglais.
    const existingArticle: LearnArticleExistingRow | null = await db.learnArticle.findUnique({
      where: { url: a.url },
      select: { title: true, summary: true },
    });
    const textChanged = existingArticle && (existingArticle.title !== a.title || existingArticle.summary !== a.summary);

    await db.learnArticle.upsert({
      where: { url: a.url },
      update: {
        title: a.title,
        summary: a.summary,
        ...(textChanged ? { titleFr: null, summaryFr: null } : {}),
        durationMinutes: a.durationMinutes,
        publishedAt: a.publishedAt ? new Date(a.publishedAt) : null,
        sourceLabel: a.sourceLabel,
        order: a.order,
        isPillar: a.isPillar,
      },
      create: {
        url: a.url,
        source: a.source,
        sourceLabel: a.sourceLabel,
        title: a.title,
        summary: a.summary,
        durationMinutes: a.durationMinutes,
        publishedAt: a.publishedAt ? new Date(a.publishedAt) : null,
        isPillar: a.isPillar,
        order: a.order,
      },
    });
  }

  return { source, ok: true, count: articles.length, error: null };
}

export async function POST() {
  const results = await Promise.all([
    refreshSource("opdecks", fetchOpDecksLearnArticles),
    refreshSource("tcgprotectors", fetchTcgProtectorsLearnArticles),
    refreshSource("shonentcg", fetchShonenTcgLearnArticles),
  ]);

  const totalArticles = results.reduce((sum, r) => sum + r.count, 0);
  const anyOk = results.some((r) => r.ok);

  return NextResponse.json({
    ok: anyOk,
    sources: results,
    totalArticles,
    capturedAt: new Date().toISOString(),
  });
}
