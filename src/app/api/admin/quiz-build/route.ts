import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSecret } from "@/lib/adminAuth";
import { QUIZ_CANDIDATES } from "@/lib/quizCandidates";
import { computeDifficulty } from "@/lib/quizDifficulty";
import { validateAnswerSet } from "@/lib/quizEngine";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH_SIZE = 5; // même volume que generate-coach-content — reste sous la limite Vercel
const GEMINI_MODEL = "gemini-3.6-flash";

const CHANGE_TYPES = [
  "cost", "power", "draw_count", "don_count", "timing", "zone", "duration", "count", "color", "restriction", "activation_cost",
] as const;

/**
 * POST /api/admin/quiz-build  { limit?: number }
 *
 * Construit les QuizCard prêtes à jouer, à partir de QUIZ_CANDIDATES
 * (voir quizCandidates.ts — sélection sourcée, jamais inventée) :
 *  1. Si Card.officialText est absent → QuizCard status="incomplete", RIEN
 *     d'autre n'est fait pour cette carte (jamais de texte inventé — voir
 *     /api/import/batch pour compléter Card d'abord).
 *  2. Sinon, un seul appel Gemini génère (a) la traduction française
 *     fidèle si Card.officialTextFr est encore absent, (b) une explication
 *     stratégique française courte, (c) 3 mauvaises réponses en français,
 *     chacune ne modifiant qu'1-2 attributs réels de l'effet (coût,
 *     puissance, pioche, DON!!, timing, zone, durée, nombre, couleur,
 *     restriction, coût d'activation — section 6 du cahier des charges),
 *     jamais générées en direct pendant une partie.
 *  3. Les 3 mauvaises réponses passent par validateAnswerSet() (doublons,
 *     réponse fausse identique à la vraie...) — si ça échoue, UNE
 *     nouvelle tentative Gemini, puis status="incomplete" si ça échoue
 *     encore (jamais une carte à mauvaises réponses invalides mise en jeu).
 *
 * Traite un petit lot par appel — à rappeler en boucle jusqu'à done=true,
 * exactement comme generate-coach-content.
 */
export async function POST(req: NextRequest) {
  const denied = requireAdminSecret(req);
  if (denied) return denied;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "GEMINI_API_KEY non configurée sur Vercel." }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const limit = Math.min(body?.limit ?? BATCH_SIZE, 10);

  // Candidats pas encore traités : ni QuizCard "ready", ni "incomplete" —
  // permet de relancer la route après un correctif (ex. scraper réparé)
  // sans retraiter ce qui a déjà réussi.
  const existingQuizCardNumbers: { cardNumber: string }[] = await db.quizCard.findMany({ select: { cardNumber: true } });
  const existingCardNumbers = new Set(existingQuizCardNumbers.map((c) => c.cardNumber));
  const todo = QUIZ_CANDIDATES.filter((c) => !existingCardNumbers.has(c.cardNumber)).slice(0, limit);

  if (todo.length === 0) {
    const remaining = QUIZ_CANDIDATES.filter((c) => !existingCardNumbers.has(c.cardNumber)).length;
    return NextResponse.json({ ok: true, processed: 0, remaining, done: remaining === 0 });
  }

  const results: { cardNumber: string; status: string; reason?: string }[] = [];

  for (const candidate of todo) {
    const card = await db.card.findUnique({ where: { cardNumber: candidate.cardNumber } });

    if (!card || !card.officialText || !card.officialText.trim()) {
      await db.quizCard.upsert({
        where: { cardNumber: candidate.cardNumber },
        update: { status: "incomplete", incompleteReason: "Texte officiel indisponible en base (limitlesstcg.com).", sourceNote: candidate.sourceNote },
        create: {
          cardNumber: candidate.cardNumber,
          status: "incomplete",
          incompleteReason: "Texte officiel indisponible en base (limitlesstcg.com).",
          sourceNote: candidate.sourceNote,
          archetypesJson: JSON.stringify(candidate.archetypes),
          metaScore: candidate.metaScore,
        },
      });
      results.push({ cardNumber: candidate.cardNumber, status: "incomplete", reason: "no officialText" });
      continue;
    }

    const needsTranslation = !card.officialTextFr || !card.officialTextFr.trim();
    let attempt = 0;
    let built: { officialTextFr: string | null; explanationFr: string; wrongAnswers: { text: string; changed: string }[] } | null = null;
    let lastIssues: string[] = [];

    while (attempt < 2 && !built) {
      attempt++;
      try {
        const generated = await callGemini(apiKey, card, candidate.archetypes, needsTranslation);
        if (!generated) {
          lastIssues = ["Réponse Gemini non exploitable."];
          continue;
        }
        const correctFr = needsTranslation ? generated.officialTextFr : card.officialTextFr!;
        const wrongTexts = generated.wrongAnswers.map((w) => w.text);
        const issues = validateAnswerSet(correctFr ?? "", wrongTexts);
        if (issues.length > 0) {
          lastIssues = issues.map((i) => i.detail);
          continue;
        }
        built = generated;
      } catch (e: any) {
        lastIssues = [e?.message ?? String(e)];
      }
      await new Promise((r) => setTimeout(r, 1500));
    }

    if (!built) {
      await db.quizCard.upsert({
        where: { cardNumber: candidate.cardNumber },
        update: { status: "incomplete", incompleteReason: `Mauvaises réponses non validées : ${lastIssues.join(" / ")}`, sourceNote: candidate.sourceNote },
        create: {
          cardNumber: candidate.cardNumber,
          status: "incomplete",
          incompleteReason: `Mauvaises réponses non validées : ${lastIssues.join(" / ")}`,
          sourceNote: candidate.sourceNote,
          archetypesJson: JSON.stringify(candidate.archetypes),
          metaScore: candidate.metaScore,
        },
      });
      results.push({ cardNumber: candidate.cardNumber, status: "incomplete", reason: lastIssues.join(" / ") });
      continue;
    }

    if (needsTranslation && built.officialTextFr) {
      const lockedFields: string[] = card.manuallyEditedFields ? JSON.parse(card.manuallyEditedFields) : [];
      if (!lockedFields.includes("officialTextFr")) {
        await db.card.update({ where: { id: card.id }, data: { officialTextFr: built.officialTextFr } });
      }
    }

    const difficulty = computeDifficulty(card.officialText);
    const archetypes = candidate.archetypes.length > 0 ? candidate.archetypes : [card.name];

    await db.quizCard.upsert({
      where: { cardNumber: candidate.cardNumber },
      update: {
        difficulty,
        archetypesJson: JSON.stringify(archetypes),
        metaScore: candidate.metaScore,
        wrongAnswersJson: JSON.stringify(built.wrongAnswers.map((w) => w.text)),
        wrongAnswersMeta: JSON.stringify(built.wrongAnswers.map((w) => w.changed)),
        explanationFr: built.explanationFr,
        status: "ready",
        incompleteReason: null,
        sourceNote: candidate.sourceNote,
      },
      create: {
        cardNumber: candidate.cardNumber,
        difficulty,
        archetypesJson: JSON.stringify(archetypes),
        metaScore: candidate.metaScore,
        wrongAnswersJson: JSON.stringify(built.wrongAnswers.map((w) => w.text)),
        wrongAnswersMeta: JSON.stringify(built.wrongAnswers.map((w) => w.changed)),
        explanationFr: built.explanationFr,
        status: "ready",
        sourceNote: candidate.sourceNote,
      },
    });
    results.push({ cardNumber: candidate.cardNumber, status: "ready" });

    // Pause entre deux appels Gemini — même marge que generate-coach-content.
    await new Promise((r) => setTimeout(r, 3000));
  }

  const remaining = QUIZ_CANDIDATES.filter(
    (c) => !existingCardNumbers.has(c.cardNumber) && !todo.some((t) => t.cardNumber === c.cardNumber)
  ).length;

  return NextResponse.json({ ok: true, processed: results.length, results, remaining, done: remaining === 0 });
}

async function callGemini(
  apiKey: string,
  card: { name: string; cardNumber: string; category: string; color: string; cost: number | null; power: number | null; counter: number | null; officialText: string | null; officialTextFr: string | null; triggerText: string | null },
  archetypes: string[],
  needsTranslation: boolean
): Promise<{ officialTextFr: string | null; explanationFr: string; wrongAnswers: { text: string; changed: string }[] } | null> {
  const prompt = `Tu es un rédacteur expert du jeu de cartes One Piece Card Game (OPTCG), pour un quiz de mémorisation des effets de cartes.

Carte réelle :
Nom : ${card.name} (${card.cardNumber})
Catégorie : ${card.category} — Couleur : ${card.color}
Coût : ${card.cost ?? "—"} — Puissance : ${card.power ?? "—"} — Counter : ${card.counter ?? "—"}
Texte officiel (anglais) : ${card.officialText}
${card.triggerText ? `Trigger : ${card.triggerText}` : ""}
${archetypes.length > 0 ? `Archétype(s)/deck(s) où elle est jouée : ${archetypes.join(", ")}` : ""}

Tâches :
${needsTranslation ? `1. Traduis fidèlement le texte officiel en français (garde les mots-clés officiels tels quels : DON!!, Leader, Trigger, Blocker, Rush, Double Attack, Banish, On Play, When Attacking, Activate: Main, etc. — ils peuvent rester en anglais, c'est l'usage).\n` : ""}2. Écris une explication stratégique simple en français (2-3 phrases) : pourquoi/quand cette carte est jouée.
3. Génère exactement 3 mauvaises réponses en français, réalistes et proches du vrai effet — chacune ne doit changer QU'1 ou 2 éléments précis parmi : le coût de la carte ciblée, la puissance gagnée/retirée, le nombre de cartes piochées, le nombre de DON!! utilisés, le timing (On Play/When Attacking/On K.O./End of Your Turn/Activate: Main...), la zone ciblée (main/deck/trash/life/field), la durée (ce tour/jusqu'au prochain tour), le nombre de cartes affectées, la couleur de la cible, une restriction présente/absente, ou le coût à payer pour activer l'effet.
Les 4 propositions (vraie + 3 fausses) doivent avoir une longueur similaire, utiliser la terminologie officielle, être grammaticalement cohérentes, et être clairement différentes les unes des autres. Une seule doit être vraie.

Réponds UNIQUEMENT avec un objet JSON valide (rien d'autre) :
{
  ${needsTranslation ? `"officialTextFr": "traduction française fidèle et complète",\n  ` : ""}"explanationFr": "explication stratégique en 2-3 phrases",
  "wrongAnswers": [
    { "text": "mauvaise réponse 1, en français, même longueur/style que la vraie réponse", "changed": "un des types de modification listés ci-dessus, en anglais snake_case (ex: cost, power, timing, zone, duration, count, color, restriction, activation_cost, draw_count, don_count)" },
    { "text": "mauvaise réponse 2", "changed": "..." },
    { "text": "mauvaise réponse 3", "changed": "..." }
  ]
}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", maxOutputTokens: 1200 },
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
    if (!Array.isArray(parsed?.wrongAnswers) || parsed.wrongAnswers.length !== 3) return null;
    const wrongAnswers = parsed.wrongAnswers.map((w: any) => ({
      text: String(w?.text ?? "").trim(),
      changed: CHANGE_TYPES.includes(w?.changed) ? w.changed : "other",
    }));
    if (wrongAnswers.some((w: { text: string }) => !w.text)) return null;
    return {
      officialTextFr: needsTranslation ? String(parsed?.officialTextFr ?? "").trim() || null : null,
      explanationFr: String(parsed?.explanationFr ?? "").trim(),
      wrongAnswers,
    };
  } catch {
    return null;
  }
}
