import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

/**
 * Ouvre la page d'historique Kaizoku dans un navigateur headless et
 * renvoie le texte affiché à l'écran, prêt pour parseKaizokuText().
 * Voir le commentaire en tête de kaizokuParser.ts pour le pourquoi du
 * navigateur headless plutôt qu'un simple fetch.
 *
 * Partagé entre :
 * - /api/cron/sync-kaizoku (déclenché par GitHub Actions / cron Vercel)
 * - /api/matches/refresh-kaizoku (déclenché par le bouton dans l'onglet
 *   Matchups)
 */
export async function scrapeKaizokuText(): Promise<string> {
  const deviceId = process.env.KAIZOKU_DEVICE_ID;
  const playerId = process.env.KAIZOKU_PLAYER_ID;
  if (!deviceId || !playerId) {
    throw new Error("KAIZOKU_DEVICE_ID et/ou KAIZOKU_PLAYER_ID non configurées sur Vercel.");
  }

  const url = `https://www.cardkaizoku.com/matchhistory/search?deviceId=${deviceId}&playerId=${playerId}&page=1`;

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 900 },
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    // Laisse le temps à React de terminer son rendu.
    await new Promise((resolve) => setTimeout(resolve, 2500));
    const text = await page.evaluate(() => document.body.innerText);
    await browser.close();
    return text;
  } catch (e) {
    if (browser) await browser.close().catch(() => {});
    throw e;
  }
}
