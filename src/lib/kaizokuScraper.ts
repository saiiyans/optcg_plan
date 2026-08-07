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
    // Un user-agent de vrai navigateur de bureau — certains sites servent
    // un rendu différent (ou bloquent) aux user-agents par défaut de
    // Puppeteer/headless Chrome.
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    );

    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    // Attend activement que le tableau de matchs soit vraiment rendu
    // (présence d'une date au format JJ/MM/AAAA dans le texte de la page)
    // plutôt qu'un délai fixe qui peut être trop court sur une fonction
    // serverless froide. Retombe sur le texte actuel si le délai max est
    // atteint, pour ne jamais bloquer indéfiniment.
    try {
      await page.waitForFunction(
        () => /\d{2}\/\d{2}\/\d{4}/.test(document.body.innerText),
        { timeout: 15000 }
      );
    } catch {
      // Continue quand même — le texte capturé ci-dessous servira au
      // diagnostic même s'il est incomplet.
    }

    const text = await page.evaluate(() => document.body.innerText);
    await browser.close();
    return text;
  } catch (e) {
    if (browser) await browser.close().catch(() => {});
    throw e;
  }
}
