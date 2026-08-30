import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSecret } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH_SIZE = 5; // petits lots, comme l'import — reste largement sous les limites de temps
const GEMINI_MODEL = "gemini-3.6-flash"; // gemini-2.5-flash (et gemini-2.5-flash-lite) ne sont plus proposés aux nouveaux comptes (404 constaté le 30/08/2026, message Google renvoyant explicitement vers gemini-3.6-flash)

/**
 * POST /api/admin/generate-coach-content
 * Body: { color?: string, limit?: number }
 *
 * Génère via l'API Gemini (gratuite, sans carte bancaire — voir GEMINI_API_KEY
 * ci-dessous), pour un lot de cartes pas encore "reviewed" :
 * - officialTextFr (traduction fidèle du texte officiel anglais)
 * - coachExplanationFr (explication pédagogique originale, en français)
 * - Si color === "Green" : mihawkAnalysisFr, mihawkPros, mihawkCons
 * - Sinon : opponentMatchupNote (impact quand la carte est en jeu adverse)
 *
 * Ne touche jamais : name, officialText (original), effets, couleur, image,
 * identifiants. Marque coachReviewed=true une fois le contenu généré.
 * Traite un petit lot par appel — à rappeler en boucle côté client pour
 * couvrir toute une couleur, exactement comme l'import de cartes.
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
    const color: string | undefined = body?.color;
    const limit = Math.min(body?.limit ?? BATCH_SIZE, 10);

    const where: Record<string, any> = { coachReviewed: false };
    if (color) where.color = { contains: color, mode: "insensitive" };

    const cards = await db.card.findMany({ where, take: limit, orderBy: { cardNumber: "asc" } });

    if (cards.length === 0) {
      return NextResponse.json({ ok: true, processed: 0, remaining: 0, done: true });
    }

    const results: { cardNumber: string; ok: boolean; error?: string }[] = [];

    for (const card of cards) {
      const isGreen = card.color.toLowerCase().includes("green");
      const prompt = buildPrompt(card, isGreen);

      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: "application/json", maxOutputTokens: 800 },
            }),
          }
        );

        if (!res.ok) {
          const errText = await res.text();
          results.push({ cardNumber: card.cardNumber, ok: false, error: `API ${res.status}: ${errText.slice(0, 200)}` });
          // Pause un peu plus longue après une erreur (souvent un 429 = quota atteint pour la minute)
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }

        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        const parsed = parseResponse(text);

        if (!parsed) {
          results.push({ cardNumber: card.cardNumber, ok: false, error: "Réponse non parsable." });
          continue;
        }

        await db.card.update({
          where: { id: card.id },
          data: {
            officialTextFr: parsed.officialTextFr ?? null,
            coachExplanationFr: parsed.coachExplanationFr ?? null,
            ...(isGreen
              ? {
                  mihawkAnalysisFr: parsed.mihawkAnalysisFr ?? null,
                  mihawkPros: parsed.mihawkPros ? JSON.stringify(parsed.mihawkPros) : null,
                  mihawkCons: parsed.mihawkCons ? JSON.stringify(parsed.mihawkCons) : null,
                }
              : { opponentMatchupNote: parsed.opponentMatchupNote ?? null }),
            coachReviewed: true,
          },
        });

        // Note Mihawk (étoiles) — uniquement pour les cartes vertes, jamais
        // écrasée si une note manuelle existe déjà (isManualOverride=true).
        // C'est ce champ que lit la Tier List des cartes.
        if (isGreen && parsed.mihawkStars != null) {
          const rawStars = typeof parsed.mihawkStars === "number" ? parsed.mihawkStars : parseFloat(String(parsed.mihawkStars));
          if (!Number.isNaN(rawStars)) {
          const stars = Math.min(5, Math.max(0, Math.round(rawStars * 2) / 2)); // arrondi au demi-point
          const existingRating = await db.personalRating.findUnique({
            where: { cardId_leaderContext: { cardId: card.id, leaderContext: "Mihawk OP14-020" } },
          });
          if (!existingRating?.isManualOverride) {
            await db.personalRating.upsert({
              where: { cardId_leaderContext: { cardId: card.id, leaderContext: "Mihawk OP14-020" } },
              update: { stars, autoStars: stars, justification: parsed.mihawkAnalysisFr ?? undefined, confidence: "généré (IA)" },
              create: {
                cardId: card.id,
                leaderContext: "Mihawk OP14-020",
                stars,
                autoStars: stars,
                justification: parsed.mihawkAnalysisFr ?? null,
                confidence: "généré (IA)",
                isManualOverride: false,
              },
            });
          }
          }
        }

        results.push({ cardNumber: card.cardNumber, ok: true });

        // Pause entre deux appels — gemini-2.5-flash a un quota gratuit
        // plus restreint (~15 requêtes/minute) que l'ancien flash-lite,
        // 4.5s garde une marge de sécurité sans logique de retry compliquée.
        await new Promise((r) => setTimeout(r, 4500));
      } catch (e: any) {
        results.push({ cardNumber: card.cardNumber, ok: false, error: e?.message ?? String(e) });
      }
    }

    const remaining = await db.card.count({ where });

    return NextResponse.json({ ok: true, processed: results.length, results, remaining, done: remaining === 0 });
  } catch (e: any) {
    console.error("POST /api/admin/generate-coach-content failed:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}

function buildPrompt(card: any, isGreen: boolean): string {
  return `Tu es un coach compétitif du jeu de cartes One Piece Card Game (OPTCG), expert du format actuel.

Voici une carte réelle du jeu, avec son texte officiel :
Nom : ${card.name}
Numéro : ${card.cardNumber}
Catégorie : ${card.category}
Couleur : ${card.color}
Coût : ${card.cost ?? "—"}
Puissance : ${card.power ?? "—"}
Texte officiel (anglais) : ${card.officialText || "(aucun effet)"}
${card.triggerText ? `Trigger : ${card.triggerText}` : ""}

Réponds UNIQUEMENT avec un objet JSON valide (rien d'autre), avec exactement ces clés :
{
  "officialTextFr": "traduction française fidèle et complète du texte officiel ci-dessus — jamais de résumé, une vraie traduction",
  "coachExplanationFr": "2-3 phrases en français expliquant simplement ce que fait cette carte et pourquoi/quand elle est utile, dans un style pédagogique pour un joueur qui apprend"${
    isGreen
      ? `,
  "mihawkAnalysisFr": "1-2 phrases sur le rôle de cette carte dans un deck Mihawk OP14-020 (deck vert, tempo/contrôle, DON!! management) — si la carte n'a pas de lien direct avec Mihawk, dis-le simplement plutôt que d'inventer une synergie",
  "mihawkPros": ["1 à 3 avantages courts"],
  "mihawkCons": ["0 à 2 inconvénients courts, tableau vide si aucun"],
  "mihawkStars": "note de 0 à 5 (par pas de 0.5) de l'utilité de cette carte dans un deck Mihawk compétitif — 5=staple quasi indispensable, 4=très solide, 3=jouable/situationnel, 2=faible mais pas inutile, 1=très marginal, 0=aucune utilité dans ce deck. Sois honnête et varié, ne mets pas systématiquement une note moyenne."`
      : `,
  "opponentMatchupNote": "1-2 phrases en français sur ce à quoi un joueur Mihawk doit faire attention si l'adversaire joue cette carte — si la carte n'a pas d'impact notable sur ce matchup, dis-le simplement plutôt que d'inventer un danger"`
  }
}

Ne présente jamais une hypothèse comme une certitude absolue. Reste concis et concret.`;
}

function parseResponse(text: string): any | null {
  try {
    const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}
