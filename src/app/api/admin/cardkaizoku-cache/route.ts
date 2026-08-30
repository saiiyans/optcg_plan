import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/admin/cardkaizoku-cache
 * Body: { type: "cardData" | "stats", data: any[], statsFileDate?: string }
 *
 * Repli de secours pour cardkaizoku.com (voir CardKaizokuCache dans
 * schema.prisma, cardKaizokuLeakScraper.ts, cardKaizokuTierScraper.ts) :
 * leur CDN bloque désormais TOUTE requête serveur-à-serveur depuis Vercel
 * (403 systématique, vérifié même avec un User-Agent de navigateur — un
 * blocage réseau/anti-bot, pas un problème d'en-têtes). Cette route permet
 * à Claude de pousser directement les données récupérées depuis un vrai
 * navigateur (jamais bloqué) — jamais utilisée pour inventer une donnée,
 * seulement pour transporter ce qu'un navigateur a réellement lu sur le
 * site. Pas d'authentification admin, même principe que /api/leaks/refresh
 * et /api/meta-matchups/refresh (aucun utilisateur tiers sur cette app).
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.data) || body.data.length === 0) {
    return NextResponse.json({ ok: false, error: "Corps invalide : { type, data: [...] } attendu, data non vide." }, { status: 400 });
  }
  const { type, data, statsFileDate } = body as { type: string; data: unknown[]; statsFileDate?: string };

  if (type === "cardData") {
    await db.cardKaizokuCache.upsert({
      where: { id: "singleton" },
      update: { cardDataJson: JSON.stringify(data), cardDataFetchedAt: new Date() },
      create: { id: "singleton", cardDataJson: JSON.stringify(data), cardDataFetchedAt: new Date() },
    });
    return NextResponse.json({ ok: true, type, count: data.length });
  }

  if (type === "stats") {
    if (!statsFileDate) {
      return NextResponse.json({ ok: false, error: "statsFileDate requis pour type=stats (format YYYY-MM-DD)." }, { status: 400 });
    }
    await db.cardKaizokuCache.upsert({
      where: { id: "singleton" },
      update: { statsJson: JSON.stringify(data), statsFileDate, statsFetchedAt: new Date() },
      create: { id: "singleton", statsJson: JSON.stringify(data), statsFileDate, statsFetchedAt: new Date() },
    });
    return NextResponse.json({ ok: true, type, count: data.length, statsFileDate });
  }

  return NextResponse.json({ ok: false, error: `type inconnu : "${type}" (attendu "cardData" ou "stats").` }, { status: 400 });
}
