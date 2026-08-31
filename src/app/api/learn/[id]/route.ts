import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchOpDecksArticleContent, fetchShonenTcgArticleContent } from "@/lib/learnScraper";

export const dynamic = "force-dynamic";
// 30s ne suffisait pas : bug corrigé le 31/08/2026 ci-dessous ajoute une
// 2e tentative Gemini quand la 1ère est tronquée, et un seul appel prend
// déjà ~20-35s. 90s laisse la marge nécessaire (Vercel Hobby autorise
// jusqu'à 300s de toute façon depuis 2026, donc aucun risque de dépasser
// un quota réel).
export const maxDuration = 90;

const GEMINI_MODEL = "gemini-3.6-flash"; // gemini-2.5-flash n'est plus proposé aux nouveaux comptes (404 constaté le 30/08/2026, message Google renvoyant explicitement vers gemini-3.6-flash)

// 3000 était TROP JUSTE pour titre + résumé + article ENTIER traduits en
// français (le français est généralement ~15-20% plus long que l'anglais
// en tokens) : Gemini coupait sa réponse en plein milieu de la valeur
// "contentFr", ce qui cassait JSON.parse et faisait échouer TOUTE la
// traduction (bug signalé le 31/08/2026 : "la traduction n'apparaît
// toujours pas"). 8192 est le vrai correctif ; parseTranslationResponse()
// ci-dessous ajoute en plus un filet de sécurité si jamais ça arrive
// quand même sur un article particulièrement long.
const MAX_OUTPUT_TOKENS = 8192;

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

function buildTranslationPrompt(title: string, summary: string | null, content: string | null): string {
  return `Traduis en français cet article de stratégie pour le jeu de cartes One Piece Card Game (OPTCG). Garde les termes de jeu propres au TCG tels quels quand c'est l'usage (DON!!, Leader, Trigger, Counter...). Conserve la mise en forme légère du contenu (lignes commençant par "## " ou "> ") telle quelle, traduis juste le texte.

Titre (anglais) : ${title}
${summary ? `Résumé (anglais) : ${summary}` : "(pas de résumé disponible)"}
${content ? `\nContenu intégral (anglais) :\n${content.slice(0, 6000)}` : "(pas de contenu intégral disponible)"}

Réponds UNIQUEMENT avec un objet JSON valide (rien d'autre) :
{
  "titleFr": "traduction française fidèle du titre",
  "summaryFr": ${summary ? '"traduction française fidèle du résumé"' : "null"},
  "contentFr": ${content ? '"traduction française fidèle du contenu intégral, avec la même mise en forme légère"' : "null"}
}`;
}

async function callGeminiTranslate(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", maxOutputTokens: MAX_OUTPUT_TOKENS },
      }),
    }
  );
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`API Gemini ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

function unescapeJsonStringFragment(s: string): string {
  // Défait les échappements JSON de base à la main — utilisé uniquement
  // par l'extraction tolérante ci-dessous, quand le texte n'est PAS un
  // JSON valide (donc JSON.parse n'est pas utilisable dessus).
  return s.replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}

/**
 * Filet de sécurité ajouté le 31/08/2026 suite au bug "la traduction
 * n'apparaît toujours pas" : même avec MAX_OUTPUT_TOKENS augmenté, un
 * article particulièrement long pourrait encore faire tronquer la réponse
 * Gemini en plein milieu de la valeur "contentFr", ce qui rend le JSON
 * invalide. Plutôt que de tout jeter dans ce cas (comportement précédent),
 * on essaie d'abord un JSON.parse strict (cas normal), puis si ça échoue on
 * extrait titleFr/summaryFr/contentFr à la main par expression régulière —
 * ces champs sont dans cet ordre dans le prompt, donc titleFr et summaryFr
 * (courts) arrivent AVANT contentFr (long) et restent lisibles même si
 * contentFr est coupé net à la fin. Le champ `clean` indique si on a pu
 * s'appuyer sur un JSON.parse strict (donc pas besoin de retenter).
 */
function parseTranslationResponse(
  rawText: string
): { titleFr: string; summaryFr: string | null; contentFr: string | null; clean: boolean } | null {
  const cleaned = rawText.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");

  try {
    const parsed = JSON.parse(cleaned);
    if (parsed?.titleFr) {
      return { titleFr: parsed.titleFr, summaryFr: parsed.summaryFr ?? null, contentFr: parsed.contentFr ?? null, clean: true };
    }
  } catch {
    // JSON invalide (probablement tronqué) : on tente l'extraction tolérante ci-dessous.
  }

  const titleMatch = cleaned.match(/"titleFr"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (!titleMatch) return null; // même le titre est illisible : rien de fiable à récupérer sur cette tentative

  const summaryMatch = cleaned.match(/"summaryFr"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  // Pas de guillemet fermant EXIGÉ pour contentFr : s'il est tronqué, on
  // récupère quand même tout ce qui a été généré avant la coupure.
  const contentMatch = cleaned.match(/"contentFr"\s*:\s*"((?:[^"\\]|\\.)*)/);

  return {
    titleFr: unescapeJsonStringFragment(titleMatch[1]),
    summaryFr: summaryMatch ? unescapeJsonStringFragment(summaryMatch[1]) : null,
    contentFr: contentMatch ? unescapeJsonStringFragment(contentMatch[1]) : null,
    clean: false,
  };
}

async function translateArticle(
  apiKey: string,
  title: string,
  summary: string | null,
  content: string | null
): Promise<{ titleFr: string; summaryFr: string | null; contentFr: string | null } | null> {
  const prompt = buildTranslationPrompt(title, summary, content);

  // Jusqu'à 2 tentatives (même logique que /api/admin/quiz-build) : garde un
  // résultat partiel (tronqué) en secours dès la 1ère tentative réussie au
  // sens large, mais retente une fois si ce n'était pas un JSON propre — la
  // 2e réponse de Gemini est parfois complète alors que la 1ère ne l'était
  // pas (non déterministe).
  let fallback: { titleFr: string; summaryFr: string | null; contentFr: string | null } | null = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    let text: string;
    try {
      text = await callGeminiTranslate(apiKey, prompt);
    } catch (e) {
      if (attempt === 2 && !fallback) throw e; // 2 échecs réseau de suite, rien en secours : on remonte l'erreur
      continue;
    }
    const parsed = parseTranslationResponse(text);
    if (!parsed) continue; // rien d'exploitable (même le titre est illisible) : retente
    if (parsed.clean) return parsed; // JSON complet et valide : terminé, inutile de retenter
    fallback = fallback ?? parsed; // résultat partiel (tronqué) : gardé en secours si la 2e tentative échoue aussi
  }
  return fallback;
}
