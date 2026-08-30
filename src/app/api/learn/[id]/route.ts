import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchOpDecksArticleContent, fetchShonenTcgArticleContent } from "@/lib/learnScraper";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const GEMINI_MODEL = "gemini-2.5-flash";

/**
 * GET /api/learn/:id — page détail d'un article Apprentissage, LISIBLE DANS
 * L'APP en français (demandé le 30/08/2026 : "les articles doivent
 * apparaître dans une nouvelle page, et être traduits en français dedans").
 *
 * Le contenu intégral (content/contentFr) n'est PAS récupéré pendant
 * /api/learn/refresh (qui reste rapide, sous la limite Vercel même avec
 * ~20 articles) : il est récupéré ET traduit ICI, à la demande, au premier
 * affichage de cette page, puis mis en cache en base pour les visites
 * suivantes (aucun nouvel appel réseau/Gemini tant que le texte source n'a
 * pas changé — voir /api/learn/refresh qui vide le cache si le titre/résumé
 * anglais change). tcgprotectors fait exception : son flux Atom fournit déjà
 * le contenu gratuitement pendant le refresh (voir learnScraper.ts), donc il
 * est déjà là ici la plupart du temps.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const article = await db.learnArticle.findUnique({ where: { id: params.id } });
  if (!article) return NextResponse.json({ ok: false, error: "Article introuvable." }, { status: 404 });

  let content = article.content;
  let contentFr = article.contentFr;
  let titleFr = article.titleFr;
  let summaryFr = article.summaryFr;
  let dirty = false;

  // 1) Contenu intégral anglais — récupéré à la demande si absent.
  if (!content) {
    if (article.source === "opdecks") content = await fetchOpDecksArticleContent(article.url);
    else if (article.source === "shonentcg") content = await fetchShonenTcgArticleContent(article.url);
    if (content) dirty = true;
  }

  // 2) Traduction française — titre/résumé (si jamais passés par
  // /api/admin/learn-translate) ET contenu intégral, en un seul appel
  // Gemini groupé pour économiser le quota gratuit plutôt que d'en faire
  // deux séparés. translationError est renvoyé au frontend (jamais avalé
  // silencieusement) — sans ça, "traduction en cours de génération..."
  // restait affiché indéfiniment sans dire POURQUOI (ex. GEMINI_API_KEY
  // absente sur Vercel), un vrai bug de diagnostic signalé le 30/08/2026.
  const apiKey = process.env.GEMINI_API_KEY;
  let translationError: string | null = null;
  const needsTranslation = !titleFr || (content && !contentFr);
  if (needsTranslation) {
    if (!apiKey) {
      translationError = "GEMINI_API_KEY non configurée sur Vercel — ajoute cette variable d'environnement puis redéploie.";
    } else {
      try {
        const translated = await translateArticle(apiKey, article.title, article.summary, content);
        if (translated) {
          if (!titleFr && translated.titleFr) { titleFr = translated.titleFr; dirty = true; }
          if (!summaryFr && translated.summaryFr) { summaryFr = translated.summaryFr; dirty = true; }
          if (content && !contentFr && translated.contentFr) { contentFr = translated.contentFr; dirty = true; }
        } else {
          translationError = "Réponse Gemini non exploitable (voir logs Vercel) — réessaie dans un instant.";
        }
      } catch (e: any) {
        translationError = e?.message ?? "Erreur réseau lors de l'appel à Gemini.";
      }
    }
  }

  if (dirty) {
    await db.learnArticle.update({
      where: { id: article.id },
      data: { content, contentFr, titleFr, summaryFr },
    });
  }

  return NextResponse.json({
    ok: true,
    article: { ...article, content, contentFr, titleFr, summaryFr },
    translationError,
  });
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
