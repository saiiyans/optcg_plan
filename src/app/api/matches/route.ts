import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { resolveOpponentLeaderId } from "@/lib/leaderNormalization";
import { maybeCreateAutoObjective } from "@/lib/autoObjectives";
import { appendMatchToMission } from "@/lib/missionEngine";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const myDeck = sp.get("myDeck");
  const mode = sp.get("mode");

  const matches = await db.match.findMany({
    where: {
      // Suppression douce (section 18) — une partie supprimée ne réapparaît
      // jamais dans les listes tant qu'elle n'est pas restaurée.
      deletedAt: null,
      ...(myDeck ? { myDeck } : {}),
      ...(mode ? { mode } : {}),
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ ok: true, matches });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const {
    date, mode, myDeck, opponentLeader, result, cardsToWatch, notes,
    turnOrder, mulligan, openingHandQuality, mainMistake, mistakesJson, mostUsefulCard, uselessCard, keyTurn,
    confidence, donRecoveredUnused, cardsInHandEnd, opponentLifeRemaining, gameDurationMinutes,
    mihawkActivations, mihawkEffectForgotten, mihawkEffectTooEarly, firstCost5Turn, decisiveMoment,
    inspiredByDeckId,
    // Journal coaching avancé (voir defeatAnalysis.ts) — tous facultatifs.
    lossReason, whatCouldHaveDoneDifferently, openingHandKeyCards, boardStateAtCritical, myLifeRemaining,
    // Phase d'entraînement, qualité de décision / lecture du résultat, version de deck (section 1, 15, 16).
    decisionQuality, resultReading, deckId,
  } = body;

  if (!date || !mode || !myDeck || !opponentLeader || !result) {
    return NextResponse.json({ ok: false, error: "Champs requis manquants (date, mode, myDeck, opponentLeader, result)." }, { status: 400 });
  }

  // Résolution best-effort du leader normalisé — un échec ici ne doit
  // jamais empêcher l'enregistrement de la partie elle-même.
  let opponentLeaderId: string | null = null;
  try {
    opponentLeaderId = await resolveOpponentLeaderId(opponentLeader);
  } catch (e) {
    console.error("resolveOpponentLeaderId failed:", e);
  }

  // Instantané de la version de deck utilisée (section 16) — best-effort,
  // ne bloque jamais l'enregistrement de la partie. deckVersionNumber =
  // nombre de versions déjà archivées pour ce deck + 1 (= version "live"
  // actuelle au moment de la partie), jamais recalculé après coup.
  let deckVersionNumber: number | null = null;
  let deckNameAtLog: string | null = null;
  if (deckId) {
    try {
      const deck = await db.deck.findUnique({ where: { id: deckId } });
      if (deck) {
        const archivedCount = await db.deckVersion.count({ where: { deckId } });
        deckVersionNumber = archivedCount + 1;
        deckNameAtLog = deck.name;
      }
    } catch (e) {
      console.error("deck version snapshot failed:", e);
    }
  }

  const match = await db.match.create({
    data: {
      date, mode, myDeck, opponentLeader, result,
      opponentLeaderId,
      cardsToWatch: cardsToWatch || null,
      notes: notes || null,
      turnOrder: turnOrder || null,
      mulligan: typeof mulligan === "boolean" ? mulligan : null,
      openingHandQuality: openingHandQuality || null,
      mainMistake: mainMistake || null,
      mistakesJson: mistakesJson || null,
      mostUsefulCard: mostUsefulCard || null,
      uselessCard: uselessCard || null,
      keyTurn: keyTurn || null,
      confidence: typeof confidence === "number" ? confidence : null,
      donRecoveredUnused: typeof donRecoveredUnused === "number" ? donRecoveredUnused : null,
      cardsInHandEnd: typeof cardsInHandEnd === "number" ? cardsInHandEnd : null,
      opponentLifeRemaining: typeof opponentLifeRemaining === "number" ? opponentLifeRemaining : null,
      gameDurationMinutes: typeof gameDurationMinutes === "number" ? gameDurationMinutes : null,
      mihawkActivations: typeof mihawkActivations === "number" ? mihawkActivations : null,
      mihawkEffectForgotten: typeof mihawkEffectForgotten === "boolean" ? mihawkEffectForgotten : null,
      mihawkEffectTooEarly: typeof mihawkEffectTooEarly === "boolean" ? mihawkEffectTooEarly : null,
      firstCost5Turn: typeof firstCost5Turn === "number" ? firstCost5Turn : null,
      decisiveMoment: decisiveMoment || null,
      inspiredByDeckId: inspiredByDeckId || null,
      lossReason: lossReason || null,
      whatCouldHaveDoneDifferently: whatCouldHaveDoneDifferently || null,
      openingHandKeyCards: openingHandKeyCards || null,
      boardStateAtCritical: boardStateAtCritical || null,
      myLifeRemaining: typeof myLifeRemaining === "number" ? myLifeRemaining : null,
      // Toute nouvelle partie créée via l'app est explicitement en phase
      // "official_training" — le défaut Prisma "test" ne sert QUE de
      // backfill pour les parties déjà existantes lors de `db push` (voir
      // schema.prisma). Ne jamais retirer ce champ explicite.
      trainingPhase: "official_training",
      decisionQuality: decisionQuality || null,
      resultReading: resultReading || null,
      deckId: deckId || null,
      deckVersionNumber,
      deckNameAtLog,
    },
  });

  // Pipeline de connexion (Priorité 8) — vérifie si un schéma de défaites
  // se dégage contre ce leader, et propose un objectif si oui. Best-effort :
  // un échec ici ne doit jamais faire échouer l'enregistrement de la partie.
  if (result === "Défaite") {
    try {
      await maybeCreateAutoObjective(myDeck, opponentLeader);
    } catch (e) {
      console.error("maybeCreateAutoObjective failed:", e);
    }
  }

  // Suivi de la mission active (section 10) — cette partie compte dans sa
  // progression sur 3, uniquement si la partie est en entraînement officiel.
  // Best-effort : ne bloque jamais l'enregistrement de la partie.
  if (match.trainingPhase === "official_training") {
    try {
      const activeMission = await db.trainingMission.findFirst({ where: { status: "active" }, orderBy: { startedAt: "desc" } });
      if (activeMission) {
        const updatedIds = appendMatchToMission(activeMission.matchIdsJson, match.id);
        if (updatedIds !== activeMission.matchIdsJson) {
          await db.trainingMission.update({ where: { id: activeMission.id }, data: { matchIdsJson: updatedIds } });
        }
      }
    } catch (e) {
      console.error("mission progress update failed:", e);
    }
  }

  return NextResponse.json({ ok: true, match });
}
