import { db } from "./db";

/**
 * Pipeline de connexion (Lot 4, Priorité 8) — après l'enregistrement d'une
 * défaite, détecte si un vrai schéma se dégage (pas un coup de malchance
 * isolé) et propose automatiquement un objectif d'entraînement dans
 * Objectifs. Ne fabrique jamais une tendance sur un échantillon trop
 * petit, et ne duplique jamais un objectif déjà proposé et non coché.
 */

const MIN_LOSSES_FOR_AUTO_OBJECTIVE = 2; // sur les 3 dernières parties contre ce leader
// Section 17 — au plus 3 objectifs matchups générés automatiquement actifs
// à la fois : au-delà, un nouveau schéma détecté n'ajoute rien tant que le
// joueur n'a pas coché (traité) un des 3 existants. Les objectifs ajoutés
// à la main par le joueur ne sont jamais comptés ni limités par ce plafond.
const MAX_ACTIVE_AUTO_MATCHUP_OBJECTIVES = 3;

export async function maybeCreateAutoObjective(myDeck: string, opponentLeader: string): Promise<void> {
  // Annotation explicite nécessaire dans cet environnement de dev (client
  // Prisma généré localement "vide" — voir la note dans deckComposition.ts).
  const recentVsOpponent: { result: string; mainMistake: string | null }[] = await db.match.findMany({
    where: { myDeck, opponentLeader, deletedAt: null },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 3,
  });

  const losses = recentVsOpponent.filter((m) => m.result === "Défaite").length;
  if (recentVsOpponent.length < MIN_LOSSES_FOR_AUTO_OBJECTIVE || losses < MIN_LOSSES_FOR_AUTO_OBJECTIVE) {
    return; // pas encore un vrai schéma, ne propose rien
  }

  // Erreur la plus fréquente sur ces parties récentes, si renseignée —
  // pour rendre la mission plus concrète qu'un simple "joue X parties".
  const mistakes = recentVsOpponent.map((m) => m.mainMistake).filter((m): m is string => !!m);
  const mistakeCounts = new Map<string, number>();
  for (const m of mistakes) mistakeCounts.set(m, (mistakeCounts.get(m) ?? 0) + 1);
  const topMistake = Array.from(mistakeCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];

  const text = topMistake
    ? `[Auto — Tendance provisoire] Joue 3 parties contre ${opponentLeader} en corrigeant : ${topMistake}.`
    : `[Auto — Tendance provisoire] Joue 3 parties contre ${opponentLeader} — ${losses} défaite(s) sur les ${recentVsOpponent.length} dernières rencontres.`;

  // Ne duplique jamais un objectif déjà proposé pour ce même adversaire et
  // pas encore coché.
  const existing = await db.objectiveItem.findFirst({
    where: { category: "matchups", done: false, text: { contains: opponentLeader } },
  });
  if (existing) return;

  // Plafond à 3 objectifs matchups auto-générés actifs (section 17) — ne
  // noie pas le joueur sous des priorités simultanées.
  const activeAutoCount = await db.objectiveItem.count({
    where: { category: "matchups", done: false, text: { startsWith: "[Auto —" } },
  });
  if (activeAutoCount >= MAX_ACTIVE_AUTO_MATCHUP_OBJECTIVES) return;

  const maxOrder = await db.objectiveItem.aggregate({ where: { category: "matchups" }, _max: { order: true } });
  await db.objectiveItem.create({
    data: {
      category: "matchups",
      text,
      isDefault: false,
      order: (maxOrder._max.order ?? 0) + 1,
    },
  });
}
