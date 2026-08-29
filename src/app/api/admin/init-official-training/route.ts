import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bangkokDateString } from "@/lib/trainingPhase";
import { requireAdminSecret } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/init-official-training
 * Aperçu seul (aucune écriture) : combien de parties sont en "Phase test"
 * vs "Entraînement officiel" aujourd'hui, et ce que ferait POST.
 *
 * POST /api/admin/init-official-training
 * Initialise AppSettings.officialTrainingStartDate SI ET SEULEMENT SI il
 * n'est pas déjà réglé — ne l'écrase jamais. Ne reclasse AUCUNE partie
 * (décision explicite du joueur : les parties déjà en "official_training"
 * restent officielles, voir le choix fait lors de cette refonte). La seule
 * chose que cette route peut faire est fixer le point de départ du
 * compteur officiel :
 *  - si des parties "official_training" existent déjà -> la date la plus
 *    ancienne parmi elles (pour ne pas repartir de zéro sur des parties
 *    déjà loguées comme officielles) ;
 *  - sinon -> aujourd'hui en Asia/Bangkok (le compteur démarre à 0/4 dès
 *    maintenant, comme demandé).
 * Idempotente : rejouer cette route ne change plus rien une fois le réglage
 * fait, tant qu'il n'est pas remis à null manuellement dans les Paramètres.
 */

async function computePreview() {
  const [testCount, officialMatches, settings] = await Promise.all([
    db.match.count({ where: { trainingPhase: "test", deletedAt: null } }),
    db.match.findMany({
      where: { trainingPhase: "official_training", deletedAt: null },
      select: { date: true },
      orderBy: { date: "asc" },
    }),
    db.appSettings.findUnique({ where: { id: "singleton" } }),
  ]);

  const earliestOfficial = officialMatches[0]?.date ?? null;
  const wouldSetStartDate = earliestOfficial ?? bangkokDateString();

  return {
    testGamesCount: testCount,
    officialGamesCount: officialMatches.length,
    currentOfficialTrainingStartDate: settings?.officialTrainingStartDate ?? null,
    wouldSetStartDateIfMissing: wouldSetStartDate,
    alreadyInitialized: !!settings?.officialTrainingStartDate,
  };
}

export async function GET(req: NextRequest) {
  const denied = requireAdminSecret(req);
  if (denied) return denied;

  const preview = await computePreview();
  return NextResponse.json({ ok: true, ...preview });
}

export async function POST(req: NextRequest) {
  const denied = requireAdminSecret(req);
  if (denied) return denied;

  const preview = await computePreview();

  if (preview.alreadyInitialized) {
    return NextResponse.json({
      ok: true,
      changed: false,
      note: "officialTrainingStartDate déjà réglé — rien à faire (idempotent).",
      ...preview,
    });
  }

  const settings = await db.appSettings.upsert({
    where: { id: "singleton" },
    update: { officialTrainingStartDate: preview.wouldSetStartDateIfMissing },
    create: { id: "singleton", officialTrainingStartDate: preview.wouldSetStartDateIfMissing },
  });

  return NextResponse.json({
    ok: true,
    changed: true,
    officialTrainingStartDate: settings.officialTrainingStartDate,
    testGamesCount: preview.testGamesCount,
    officialGamesCount: preview.officialGamesCount,
    note:
      preview.officialGamesCount > 0
        ? "Des parties étaient déjà en Entraînement officiel — elles sont conservées telles quelles, le compteur part de la plus ancienne d'entre elles."
        : "Aucune partie officielle existante — le compteur démarre à 0/4 aujourd'hui.",
  });
}
