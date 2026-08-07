import { NextRequest, NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { syncKaizokuMatches } from "@/lib/kaizokuSync";

export const dynamic = "force-dynamic";
// Ouvrir un vrai navigateur + laisser React se rendre prend plusieurs
// secondes. 60s couvre large ; ajuste selon ton plan Vercel (Hobby: max
// 60s via cette config ; Pro: jusqu'à 300s si jamais besoin de plus).
export const maxDuration = 60;

/**
 * GET /api/cron/sync-kaizoku
 *
 * Ouvre la page d'historique Kaizoku dans un navigateur headless (le site
 * est une app React sans donnée exploitable côté serveur — voir le
 * commentaire en tête de kaizokuParser.ts), récupère le texte affiché,
 * parse et importe les nouvelles parties. Même logique de déduplication
 * que l'import manuel — aucun risque de doublon, peu importe qui déclenche
 * cette route ou à quelle fréquence.
 *
 * Déclenchée par :
 * - GitHub Actions (.github/workflows/sync-kaizoku.yml), toutes les 30 min
 * - Le Cron Vercel de secours (vercel.json), une fois par jour — le
 *   maximum autorisé sur le plan Hobby
 *
 * Protégée par un secret partagé (Authorization: Bearer <CRON_SECRET>) —
 * sans lui, n'importe qui pourrait déclencher un scraping à répétition.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Non autorisé." }, { status: 401 });
  }

  const deviceId = process.env.KAIZOKU_DEVICE_ID;
  const playerId = process.env.KAIZOKU_PLAYER_ID;
  if (!deviceId || !playerId) {
    return NextResponse.json(
      { ok: false, error: "KAIZOKU_DEVICE_ID et/ou KAIZOKU_PLAYER_ID non configurées sur Vercel." },
      { status: 500 }
    );
  }

  const url = `https://www.cardkaizoku.com/matchhistory/search?deviceId=${deviceId}&playerId=${playerId}&page=1`;

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    // Laisse le temps à React de terminer son rendu après le dernier appel
    // réseau détecté — le tableau de matchs apparaît juste après.
    await new Promise((resolve) => setTimeout(resolve, 2500));
    const text = await page.evaluate(() => document.body.innerText);
    await browser.close();
    browser = null;

    const summary = await syncKaizokuMatches(text, "Simulateur");
    return NextResponse.json({ ok: true, ...summary, triggeredBy: req.headers.get("x-vercel-cron-schedule") ? "vercel-cron" : "external" });
  } catch (e: any) {
    if (browser) await browser.close().catch(() => {});
    console.error("GET /api/cron/sync-kaizoku failed:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
