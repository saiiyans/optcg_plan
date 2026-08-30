import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchOpDecksArticleContent, fetchShonenTcgArticleContent } from "@/lib/learnScraper";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const GEMINI_MODEL = "gemini-3.6-flash"; // gemini-2.5-flash n'est plus proposé aux nouveaux comptes (404 constaté le 30/08/2026, message Google renvoyant explicitement vers gemini-3.6-flash)

/**
 * GET/POST /api/learn/:id — page détail d'un article Apprentissage, LISIBLE
 * DANS L'APP en français (demandé le 30/08/2026).
 *
 * SÉPARÉ EN DEUX (30/08/2026) : la première version faisait TOUT dans un
 * seul GET (récupération du contenu intégral ET appel Gemini) avant de
 * répondre — un joueur a signalé "quand je clique c'est vide", parce que le
 * lecteur restait sur le squelette de chargement pendant tout l'appel
 * réseau à Gemini (souvent plusieurs secondes, plus encore quand ça échoue).
 * Maintenant : GET répond dès que le texte anglais est prêt (rapide, aucun
 * appel Gemini) et POST déclenche la traduction séparément, à l'affichage —
 * le lecteur voit le texte anglais quasi instantanément, puis seul le petit
 * encart de traduction en bas de page attend Gemini.
 *
 * `?rescrape=1` (GET) force une nouvelle récupération du contenu même si
 * une version est déjà en cache — utile après une correction du scraper
 * (voir learnScraper.ts, bug de tableau aplati corrigé le 30/08/2026) pour
 * régénérer les articles déjà en cache sans purge manuelle de la base.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const article = await db.learnArticle.findUnique({ where: { id: params.id } });
  if (!article) return NextResponse.json({ ok: false, error: "Article introuvable." }, { status: 404 });

  const forceRescrape = req.nextUrl.searchParams.get("rescrape") === "1";
  let content = article.content;
  let contentFr = article.contentFr;
  let dirty = false;

  if (!content || forceRescrape) {
    let fresh: string | null = null;
    if (article.source === "opdecks") fresh = await fetchOpDecksArticleContent(article.url);
    else if (article.source === "shonentcg") fresh = await fetchShonenTcgArticleContent(article.url);
    if (fresh && fresh !== content) {
      content = fresh;
      contentFr = null; // le texte anglais a changé (ou a été régénéré) : l'ancienne traduction ne correspond plus
      dirty = true;
    }
  }

  if (dirty) {
    await db.learnArticle.update({ where: { id: article.id }, data: { content, contentFr } });
  }

  return NextResponse.json({
    ok: true,
    article: { ...article, content, contentFr },
  });
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const article = await db.learnArticle.findUnique({ where: { id: params.id } });
  if (!article) return NextResponse.json({ ok: false, error: "Article introuvable." }, { status: 404 });

  let content = article.content;
  if (!content) {
    if (article.source === "opdecks") content = await fetchOpDecksArticleContent(article.url);
    else if (article.source === "shonentcg") content = await fetchShonenTcgArticleContent(article.url);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      ok: true,
      titleFr: article.titleFr,
      summaryFr: article.summaryFr,
      contentFr: article.contentFr,
      translationError: "GEMINI_API_KEY non configurée sur Vercel — ajoute cette variable d'environnement puis redéploie.",
    });
  }

  let titleFr = article.titleFr;
  let summaryFr = article.summaryFr;
  let contentFr = article.contentFr;
  let translationError: string | null = null;

  try {
    const translated = await translateArticle(apiKey, article.title, article.summary, content);
    if (translated) {
      titleFr = translated.titleFr ?? titleFr;
      summaryFr = translated.summaryFr ?? summaryFr;
      contentFr = translated.contentFr ?? contentFr;
    } else {
      translationError = "Réponse Gemini non exploitable (voir logs Vercel) — réessaie dans un instant.";
    }
  } catch (e: any) {
    translationError = e?.message ?? "Erreur réseau lors de l'appel à Gemini.";
  }

  await db.learnArticle.update({
    where: { id: article.id },
    data: { content, contentFr, titleFr, summaryFr },
  });

  return NextResponse.json({ ok: true, titleFr, summaryFr, contentFr, translationError });
}

async function translateArticle(
  apiKey: string,
  title: string,
  summary: string | null,
  content: string | null
): Promise<{ titleFr: string; summaryFr: string | null; contentFr: string | null } | null> {
  const prompt = `Traduis en français cet article de stratégie pour le jeu de cartes One Piece Card Game (OPTCG). Garde les termes de jeu propres au TCG tels quels quand c'est l'usage (DON!!, Leader, Trigger, Counter...). Conserve la mise en forme légère du contenu (lignes commençant par "## " ou "> ") telle quelle, traduis juste le texte.

Titre (anglais) : ${title}
${summary ? `Résumé (anglais) : ${summary}` : "(pas de résumé disponible)"}
${content ? `\nContenu intégral (anglais) :\n${content.slice(0, 6000)}` : "(pas de contenu intégral disponible)"}

Réponds UNIQUEMENT avec un objet JSON valide (rien d'autre) :
{
  "titleFr": "traduction française fidèle du titre",
  "summaryFr": ${summary ? '"traduction française fidèle du résumé"' : "null"},
  "contentFr": ${content ? '"traduction française fidèle du contenu intégral, avec la même mise en forme légère"' : "null"}
}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", maxOutputTokens: 3000 },
      }),
    }
  );
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`API Gemini ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  try {
    const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
    const parsed = JSON.parse(cleaned);
    if (!parsed?.titleFr) return null;
    return { titleFr: parsed.titleFr, summaryFr: parsed.summaryFr ?? null, contentFr: parsed.contentFr ?? null };
  } catch {
    return null;
  }
}
