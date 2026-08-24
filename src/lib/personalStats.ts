import { db } from "./db";

/**
 * Statistiques personnelles complètes (Lot 2, Priorité 6). Chaque section
 * respecte la règle "pas de conclusion fiable sous 5 parties" — renvoie
 * hasData=false avec une raison explicite plutôt qu'un chiffre trompeur.
 */

const MIN_SAMPLE = 5;

function winrate(matches: { result: string }[]): number {
  if (matches.length === 0) return 0;
  return Math.round((matches.filter((m) => m.result === "Victoire").length / matches.length) * 100);
}

export type PhaseFilter = "official_training" | "test" | "all";

export interface PersonalStats {
  general: {
    total: number;
    wins: number;
    losses: number;
    winrate: number;
    // Fiabilité des stats (section 12/13) — ne jamais laisser croire que
    // "total" représente l'entraînement officiel si le filtre est "all".
    phase: PhaseFilter;
    documented: number; // parties avec au moins une info d'analyse renseignée
    avgDurationMinutes: number | null;
    avgEndTurn: number | null; // approximé via keyTurn quand parseable
    simulateur: { total: number; winrate: number };
    boutique: { total: number; winrate: number };
    // Série en cours (positif = victoires d'affilée, négatif = défaites),
    // meilleure série de victoires jamais enregistrée, et winrate sur les
    // 10 dernières parties comparé au winrate global — pour voir la
    // tendance récente plutôt qu'une seule moyenne figée depuis le début.
    currentStreak: number;
    bestWinStreak: number;
    recentForm: { total: number; winrate: number } | null; // null si <5 parties au total
  };
  firstSecond: {
    hasData: boolean;
    reason?: string;
    first?: { total: number; winrate: number; avgDuration: number | null };
    second?: { total: number; winrate: number; avgDuration: number | null };
  };
  mulligan: {
    hasData: boolean;
    reason?: string;
    mulliganRate?: number;
    winrateWithMulligan?: number;
    winrateWithoutMulligan?: number;
    byHandQuality?: Record<string, { total: number; winrate: number }>;
  };
  mihawk: {
    hasData: boolean;
    reason?: string;
    avgActivations?: number | null;
    effectForgottenRate?: number | null;
    effectTooEarlyRate?: number | null;
    avgFirstCost5Turn?: number | null;
    avgDonRecoveredUnused?: number | null;
  };
  style: {
    hasData: boolean;
    reason?: string;
    topMistakes?: { mistake: string; count: number }[];
  };
}

function parseTurnNumber(keyTurn: string | null): number | null {
  if (!keyTurn) return null;
  const m = keyTurn.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

export async function computePersonalStats(myDeck?: string, phase: PhaseFilter = "official_training"): Promise<PersonalStats> {
  const matches = await db.match.findMany({
    where: {
      deletedAt: null,
      ...(myDeck ? { myDeck } : {}),
      // Fiabilité des stats (section 1/13) — par défaut, seules les parties
      // d'entraînement officiel comptent. "test" et "all" restent
      // disponibles via le filtre explicite, jamais mélangés silencieusement.
      ...(phase === "all" ? {} : { trainingPhase: phase }),
    },
    orderBy: { date: "desc" },
  });

  const total = matches.length;
  const wins = matches.filter((m) => m.result === "Victoire").length;
  // "Documentée" = au moins une info d'analyse au-delà des champs de base
  // (résultat/deck/adversaire) — sert à ne jamais présenter une conclusion
  // comme "8 sur 162" quand seule une fraction a été réellement analysée.
  const documented = matches.filter(
    (m: (typeof matches)[number]) =>
      m.lossReason || m.mainMistake || m.mistakesJson || m.keyTurn || m.decisiveMoment || m.boardStateAtCritical || m.turnOrder
  ).length;
  const durations = matches.map((m) => m.gameDurationMinutes).filter((d): d is number => d != null);
  const endTurns = matches.map((m) => parseTurnNumber(m.keyTurn)).filter((t): t is number => t != null);

  const sim = matches.filter((m) => m.mode === "Simulateur");
  const shop = matches.filter((m) => m.mode === "Boutique");

  // matches est trié par date desc (voir la requête plus haut) — donc
  // matches[0] est la partie la plus récente. La série en cours compte
  // depuis le début de ce tableau jusqu'au premier résultat différent.
  let currentStreak = 0;
  if (matches.length > 0) {
    const firstResult = matches[0].result;
    for (const m of matches) {
      if (m.result !== firstResult) break;
      currentStreak++;
    }
    if (firstResult !== "Victoire") currentStreak = -currentStreak;
  }
  let bestWinStreak = 0;
  {
    let run = 0;
    // Reparcouru dans l'ordre chronologique (chronologique = inverse de
    // date desc) pour que "meilleure série" ait un sens dans le temps.
    for (const m of [...matches].reverse()) {
      if (m.result === "Victoire") {
        run++;
        bestWinStreak = Math.max(bestWinStreak, run);
      } else {
        run = 0;
      }
    }
  }
  const recentMatches = matches.slice(0, 10);
  const recentForm = total >= 5 ? { total: recentMatches.length, winrate: winrate(recentMatches) } : null;

  const general = {
    total,
    wins,
    losses: total - wins,
    winrate: winrate(matches),
    phase,
    documented,
    avgDurationMinutes: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
    avgEndTurn: endTurns.length ? Math.round((endTurns.reduce((a, b) => a + b, 0) / endTurns.length) * 10) / 10 : null,
    simulateur: { total: sim.length, winrate: winrate(sim) },
    boutique: { total: shop.length, winrate: winrate(shop) },
    currentStreak,
    bestWinStreak,
    recentForm,
  };

  // Premier / Second
  const firstMatches = matches.filter((m) => m.turnOrder === "Premier");
  const secondMatches = matches.filter((m) => m.turnOrder === "Second");
  let firstSecond: PersonalStats["firstSecond"];
  if (firstMatches.length < MIN_SAMPLE || secondMatches.length < MIN_SAMPLE) {
    firstSecond = {
      hasData: false,
      reason: `${firstMatches.length} partie(s) en premier, ${secondMatches.length} en second — ${MIN_SAMPLE} minimum de chaque côté pour comparer de façon fiable.`,
    };
  } else {
    const firstDur = firstMatches.map((m) => m.gameDurationMinutes).filter((d): d is number => d != null);
    const secondDur = secondMatches.map((m) => m.gameDurationMinutes).filter((d): d is number => d != null);
    firstSecond = {
      hasData: true,
      first: { total: firstMatches.length, winrate: winrate(firstMatches), avgDuration: firstDur.length ? Math.round(firstDur.reduce((a, b) => a + b, 0) / firstDur.length) : null },
      second: { total: secondMatches.length, winrate: winrate(secondMatches), avgDuration: secondDur.length ? Math.round(secondDur.reduce((a, b) => a + b, 0) / secondDur.length) : null },
    };
  }

  // Mulligan
  const withMulliganInfo = matches.filter((m) => m.mulligan !== null);
  let mulligan: PersonalStats["mulligan"];
  if (withMulliganInfo.length < MIN_SAMPLE) {
    mulligan = { hasData: false, reason: `${withMulliganInfo.length} partie(s) avec mulligan renseigné — ${MIN_SAMPLE} minimum.` };
  } else {
    const withM = withMulliganInfo.filter((m) => m.mulligan === true);
    const withoutM = withMulliganInfo.filter((m) => m.mulligan === false);
    const byQuality: Record<string, { total: number; winrate: number }> = {};
    for (const m of matches) {
      if (!m.openingHandQuality) continue;
      byQuality[m.openingHandQuality] = byQuality[m.openingHandQuality] || { total: 0, winrate: 0 };
      byQuality[m.openingHandQuality].total++;
    }
    for (const q of Object.keys(byQuality)) {
      const list = matches.filter((m) => m.openingHandQuality === q);
      byQuality[q].winrate = winrate(list);
    }
    mulligan = {
      hasData: true,
      mulliganRate: Math.round((withM.length / withMulliganInfo.length) * 100),
      winrateWithMulligan: withM.length ? winrate(withM) : undefined,
      winrateWithoutMulligan: withoutM.length ? winrate(withoutM) : undefined,
      byHandQuality: byQuality,
    };
  }

  // Mihawk (spécifique au leader Mihawk)
  const mihawkMatches = matches.filter((m) => m.myDeck.includes("Mihawk"));
  const withActivations = mihawkMatches.filter((m) => m.mihawkActivations != null);
  let mihawk: PersonalStats["mihawk"];
  if (withActivations.length < MIN_SAMPLE) {
    mihawk = { hasData: false, reason: `${withActivations.length} partie(s) Mihawk avec activations notées — ${MIN_SAMPLE} minimum.` };
  } else {
    const activations = withActivations.map((m) => m.mihawkActivations!).filter((n) => n != null);
    const forgotten = mihawkMatches.filter((m) => m.mihawkEffectForgotten != null);
    const tooEarly = mihawkMatches.filter((m) => m.mihawkEffectTooEarly != null);
    const firstCost5 = mihawkMatches.map((m) => m.firstCost5Turn).filter((n): n is number => n != null);
    const donUnused = mihawkMatches.map((m) => m.donRecoveredUnused).filter((n): n is number => n != null);
    mihawk = {
      hasData: true,
      avgActivations: activations.length ? Math.round((activations.reduce((a, b) => a + b, 0) / activations.length) * 10) / 10 : null,
      effectForgottenRate: forgotten.length ? Math.round((forgotten.filter((m) => m.mihawkEffectForgotten).length / forgotten.length) * 100) : null,
      effectTooEarlyRate: tooEarly.length ? Math.round((tooEarly.filter((m) => m.mihawkEffectTooEarly).length / tooEarly.length) * 100) : null,
      avgFirstCost5Turn: firstCost5.length ? Math.round((firstCost5.reduce((a, b) => a + b, 0) / firstCost5.length) * 10) / 10 : null,
      avgDonRecoveredUnused: donUnused.length ? Math.round((donUnused.reduce((a, b) => a + b, 0) / donUnused.length) * 10) / 10 : null,
    };
  }

  // Style de jeu — erreurs les plus fréquentes. Utilise mistakesJson
  // (toutes les cases cochées, sélection multiple) quand disponible ; pour
  // les parties enregistrées avant l'ajout des cases à cocher multiples,
  // retombe sur mainMistake (une seule case). Une partie avec 3 erreurs
  // cochées compte donc pour les 3, pas seulement la première — c'est ce
  // qui manquait ici jusqu'à cette mise à jour.
  function matchMistakes(m: (typeof matches)[number]): string[] {
    if (m.mistakesJson) {
      try {
        const parsed = JSON.parse(m.mistakesJson);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // JSON invalide — retombe sur mainMistake ci-dessous
      }
    }
    return m.mainMistake ? [m.mainMistake] : [];
  }
  const withMistake = matches.filter((m) => matchMistakes(m).length > 0);
  let style: PersonalStats["style"];
  if (withMistake.length < MIN_SAMPLE) {
    style = { hasData: false, reason: `${withMistake.length} partie(s) avec erreur notée — ${MIN_SAMPLE} minimum.` };
  } else {
    const counts = new Map<string, number>();
    for (const m of withMistake) {
      for (const mistake of matchMistakes(m)) counts.set(mistake, (counts.get(mistake) ?? 0) + 1);
    }
    const topMistakes = Array.from(counts.entries())
      .map(([mistake, count]) => ({ mistake, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
    style = { hasData: true, topMistakes };
  }

  return { general, firstSecond, mulligan, mihawk, style };
}
