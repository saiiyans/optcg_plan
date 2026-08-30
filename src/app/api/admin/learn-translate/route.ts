import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSecret } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH_SIZE = 5; // même volume que /api/admin/generate-coach-content
const GEMINI_MODEL = "gemini-2.5-flash";

/**
 * POST /api/admin/learn-translate
 * Body: { limit?: number }
 *
 * Traduit en français (via l'API Gemini, même mécanisme que
 * Card.officialTextFr) le titre + résumé des articles de la rubrique
 * Apprentissage qui n'ont pas encore de traduction (titleFr IS NULL).
 * Ne touche JAMAIS title/summary (texte original anglais, conservé pour le
 * lien "Source" affiché sous chaque carte sur /learn).
 *
 * Appelé automatiquement en boucle par /learn juste après un clic sur
 * "Actualiser" (voir learn/page.tsx) — jusqu'à done=true — plutôt qu'un
 * bouton séparé, comme demandé : la traduction suit l'actualisation sans
 * étape manuelle en plus. Petit lot par appel, comme generate-coach-content,
 * pour rester sous la limite de temps d'une fonction Vercel et respecter le
 * quota gratuit Gemini (~15 req/min).
 */
export async function POST(req: NextRequest) {
  const denied = requireAdminSecret(req);
  if (denied) return denied;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "GEMINI_API_KEY non configurée sur Vercel." }, { status: 500 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const limit = Math.min(body?.limit ?? BATCH_SIZE, 10);

    const articles = await db.learnArticle.findMany({
      where: { titleFr: null },
      take: limit,
      orderBy: [{ isPillar: "desc" }, { createdAt: "asc" }],
    });

    if (articles.length === 0) {
      return NextResponse.json({ ok: true, processed: 0, remaining: 0, done: true });
    }

    const results: { id: string; ok: boolean; error?: string }[] = [];

    for (const a of articles) {
      const prompt = buildPrompt(a.title, a.summary);
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: "application/json", maxOutputTokens: 400 },
            }),
          }
        );

        if (!res.ok) {
          const errText = await res.text();
          results.push({ id: a.id, ok: false, error: `API ${res.status}: ${errText.slice(0, 200)}` });
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }

        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        const parsed = parseResponse(text);

        if (!parsed?.titleFr) {
          results.push({ id: a.id, ok: false, error: "Réponse non parsable." });
          continue;
        }

        await db.learnArticle.update({
          where: { id: a.id },
          data: { titleFr: parsed.titleFr, summaryFr: a.summary ? parsed.summaryFr ?? null : null },
        });
        results.push({ id: a.id, ok: true });

        await new Promise((r) => setTimeout(r, 4500));
      } catch (e: any) {
        results.push({ id: a.id, ok: false, error: e?.message ?? String(e) });
      }
    }

    const remaining = await db.learnArticle.count({ where: { titleFr: null } });

    return NextResponse.json({ ok: true, processed: results.length, results, remaining, done: remaining === 0 });
  } catch (e: any) {
    console.error("POST /api/admin/learn-translate failed:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}

function buildPrompt(title: string, summary: string | null): string {
  return `Traduis en français cet article de stratégie pour le jeu de cartes One Piece Card Game (OPTCG). Garde les termes de jeu propres au TCG tels quels quand c'est l'usage (DON!!, Leader, Trigger, Counter...).

Titre (anglais) : ${title}
${summary ? `Résumé (anglais) : ${summary}` : "(pas de résumé disponible)"}

Réponds UNIQUEMENT avec un objet JSON valide (rien d'autre) :
{
  "titleFr": "traduction française fidèle du titre",
  ${summary ? '"summaryFr": "traduction française fidèle du résumé"' : '"summaryFr": null'}
}`;
}

function parseResponse(text: string): any | null {
  try {
    const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}
