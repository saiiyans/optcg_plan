import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSecret } from "@/lib/adminAuth";

const LEADER_CONTEXT = "Mihawk OP14-020";

/**
 * Notes de base éditables pour les 17 cartes du deck Mihawk personnel,
 * fournies explicitement (pas générées) — les demi-étoiles sont
 * supportées nativement (PersonalRating.stars est un Float).
 *
 * Upsert : si une note existe déjà ET a été corrigée à la main
 * (isManualOverride=true), elle n'est jamais écrasée — conforme à la
 * règle "ne remplace jamais une donnée correcte par une donnée
 * approximative". Ces valeurs ne sont donc qu'une base de départ.
 */
const SEED_RATINGS: { cardNumber: string; stars: number; justification: string }[] = [
  { cardNumber: "OP12-034", stars: 5, justification: "Chercheuse universelle quasi garantie — trouve presque toujours une cible utile, cible idéale à reposer pour l'effet leader." },
  { cardNumber: "ST32-003", stars: 5, justification: "Pièce centrale du plan de jeu — génère un tempo massif, mais nécessite une cible valide en main pour son plein potentiel." },
  { cardNumber: "ST32-002", stars: 5, justification: "Développement gratuit à haute valeur, combo direct avec le board Mihawk établi." },
  { cardNumber: "OP13-031", stars: 5, justification: "Développement gratuit avec pression supplémentaire (Banish) — un des meilleurs enchaînements du deck." },
  { cardNumber: "OP12-037", stars: 5, justification: "DON Loop puissant — le DON!! dépensé pour contrôler l'adversaire est presque intégralement récupéré le même tour." },
  { cardNumber: "OP13-040", stars: 5, justification: "Même logique que OP12-037 mais orientée verrouillage plutôt que retrait — outil de contrôle clé." },
  { cardNumber: "ST24-004", stars: 4.5, justification: "Excellent finisher de fin de partie et bon outil défensif — nécessite une préparation (2 personnages adverses déjà reposés) pour son bonus complet. N'est PAS un Blocker." },
  { cardNumber: "OP14-033", stars: 4.5, justification: "Bloque efficacement la ressource adverse au bon moment, très fort en boucle avec l'effet leader." },
  { cardNumber: "OP14-023", stars: 4.5, justification: "Se réactive seule en End Phase — reste néanmoins attaquable et retirable pendant qu'elle est reposée, ce n'est pas une protection totale." },
  { cardNumber: "OP07-022", stars: 4.5, justification: "Counter fiable et cherchable, présence constante dans la liste." },
  { cardNumber: "ST32-001", stars: 4.5, justification: "Counter cherchable qui se réactive seule — jamais neutralisée durablement par une attaque adverse." },
  { cardNumber: "OP01-055", stars: 4.5, justification: "Effet flexible à bon coût, s'intègre bien dans la plupart des séquences de tour." },
  { cardNumber: "OP10-030", stars: 4, justification: "Solide sans être exceptionnelle, bon filler de courbe." },
  { cardNumber: "OP14-119", stars: 4, justification: "Frappe fort et est difficile à retirer — n'est PAS jouée gratuitement ni jouée directement par l'effet leader (elle doit être jouée normalement, puis peut être reposée via l'effet leader une fois en jeu)." },
  { cardNumber: "ST32-005", stars: 4, justification: "Bon complément de courbe, utile sans être une pièce centrale du plan de jeu." },
  { cardNumber: "OP14-039", stars: 4, justification: "Pioche et redonne du DON!! — cible parfaite à reposer pour l'effet leader sans jamais affaiblir le board." },
  { cardNumber: "OP06-038", stars: 3.5, justification: "Utile en contexte précis, moins impactante en dehors de son matchup cible." },
];

/**
 * POST /api/admin/seed-mihawk-ratings
 *
 * Ne touche jamais aux notes déjà corrigées à la main (isManualOverride).
 * Ne touche à aucun autre champ de Card (nom, effet, couleur, image...).
 */
export async function POST(req: NextRequest) {
  const denied = requireAdminSecret(req);
  if (denied) return denied;

  const results: { cardNumber: string; status: string }[] = [];

  for (const seed of SEED_RATINGS) {
    const card = await db.card.findUnique({ where: { cardNumber: seed.cardNumber } });
    if (!card) {
      results.push({ cardNumber: seed.cardNumber, status: "carte introuvable en base" });
      continue;
    }

    const existing = await db.personalRating.findUnique({
      where: { cardId_leaderContext: { cardId: card.id, leaderContext: LEADER_CONTEXT } },
    });

    if (existing?.isManualOverride) {
      results.push({ cardNumber: seed.cardNumber, status: "ignorée — déjà corrigée à la main" });
      continue;
    }

    await db.personalRating.upsert({
      where: { cardId_leaderContext: { cardId: card.id, leaderContext: LEADER_CONTEXT } },
      update: {
        stars: seed.stars,
        autoStars: seed.stars,
        justification: seed.justification,
        confidence: "élevé",
      },
      create: {
        cardId: card.id,
        leaderContext: LEADER_CONTEXT,
        stars: seed.stars,
        autoStars: seed.stars,
        justification: seed.justification,
        confidence: "élevé",
        recommendedCount: null,
        isManualOverride: false,
      },
    });
    results.push({ cardNumber: seed.cardNumber, status: "note appliquée" });
  }

  return NextResponse.json({ ok: true, total: SEED_RATINGS.length, results });
}
