import * as cheerio from "cheerio";

/**
 * Importateur pour la base de cartes vertes anglaises de Limitless.
 *
 * IMPORTANT — à lire avant d'utiliser ce module :
 * - Ce scraper tourne UNIQUEMENT sur ta machine, quand tu lances `npm run dev`
 *   toi-même. Il fait des requêtes HTTP classiques (fetch), aucune donnée
 *   n'est envoyée ailleurs que vers onepiece.limitlesstcg.com.
 * - Il envoie un User-Agent explicite qui identifie l'outil comme un usage
 *   personnel et non-commercial, et respecte un délai (`REQUEST_DELAY_MS`)
 *   entre chaque requête pour ne pas surcharger le site.
 * - Vérifie toi-même les conditions d'utilisation de Limitless
 *   (https://limitlesstcg.com/about, /legal) avant de lancer un import complet.
 *   Ce module n'automatise aucun contournement de protection : il lit du HTML
 *   public exactement comme le ferait ton navigateur.
 * - Les images ne sont jamais copiées localement : seule leur URL distante
 *   (limitlesstcg.nyc3.cdn.digitaloceanspaces.com) est stockée, avec
 *   lazy-loading côté interface.
 */

const BASE = "https://onepiece.limitlesstcg.com";
const REQUEST_DELAY_MS = 700; // délai de politesse entre deux requêtes
const USER_AGENT =
  "optcg-green-library/0.1 (personal non-commercial deck tool; contact: local-user)";

export interface ScrapedCard {
  cardNumber: string;
  name: string;
  category: string;
  color: string;
  setCode: string;
  rarity: string | null;
  cost: number | null;
  power: number | null;
  counter: number | null;
  attribute: string | null;
  types: string;
  officialText: string | null;
  triggerText: string | null;
  imageUrl: string;
  cardUrl: string;
  sourceUrl: string;
  releaseDate: string | null;
  legalityStatus: string | null;
  block: string | null;
  language: string;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function politeFetch(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} en récupérant ${url}`);
  }
  const html = await res.text();
  await sleep(REQUEST_DELAY_MS);
  return html;
}

/**
 * Étape 1 : parcourt toutes les pages de la liste filtrée et retourne la
 * liste dédupliquée des numéros de cartes de BASE (les variantes ?v=N sont
 * regroupées sous la carte de base, jamais comptées comme cartes séparées).
 */
export async function listAllCardNumbers(
  searchUrl: string,
  onProgress?: (page: number, totalPages: number | null) => void
): Promise<{ cardNumbers: string[]; totalFoundOnSite: number }> {
  const cardNumbers = new Set<string>();

  // Extrait le "color:xxx" et "lang:xxx" éventuels de la recherche fournie,
  // pour les réappliquer à chaque sous-requête par set.
  const colorMatch = searchUrl.match(/color%3A(\w+)|color:(\w+)/i);
  const color = colorMatch ? (colorMatch[1] || colorMatch[2]) : "green";

  // Étape 1 : découvre dynamiquement la liste de tous les sets existants
  // depuis le catalogue — jamais codée en dur, donc une nouvelle extension
  // est prise en compte automatiquement au prochain import, sans changer
  // le code.
  const catalogHtml = await politeFetch(`${BASE}/cards`);
  const $catalog = cheerio.load(catalogHtml);
  const setCodes = new Set<string>();
  $catalog("a[href*='/cards/']").each((_, el) => {
    const href = $catalog(el).attr("href") || "";
    // Les liens de set ressemblent à /cards/op07-500-years-in-the-future —
    // on ne garde que le préfixe de code (ex: OP07, ST32, EB01, PRB02).
    const m = href.match(/\/cards\/([a-z]+\d+)-/i);
    if (m) setCodes.add(m[1].toUpperCase());
  });

  onProgress?.(0, setCodes.size);

  // Étape 2 : pour chaque set, une requête scopée — le nombre de cartes par
  // set (au maximum ~320) reste toujours sous la taille de page par défaut
  // du site, donc jamais besoin de paginer.
  let i = 0;
  for (const code of setCodes) {
    i++;
    const setSearchUrl = `${BASE}/cards/?q=${encodeURIComponent(`set:${code} color:${color} lang:en`)}`;
    try {
      const html = await politeFetch(setSearchUrl);
      const $ = cheerio.load(html);
      // Les vignettes pointent vers /cards/XXNN-NNN (parfois /cards/en/XXNN-NNN
      // selon la page) — on accepte les deux formes, avec ou sans suffixe ?v=.
      $("a[href*='/cards/']").each((_, el) => {
        const href = $(el).attr("href") || "";
        const m = href.match(/\/cards\/(?:en\/)?([A-Z0-9]+-\d+)/i);
        if (m) cardNumbers.add(m[1].toUpperCase());
      });
    } catch {
      // Un set inaccessible ne doit pas arrêter tout l'import — on continue
      // avec les suivants.
    }
    onProgress?.(i, setCodes.size);
  }

  return { cardNumbers: Array.from(cardNumbers), totalFoundOnSite: cardNumbers.size };
}

/**
 * Étape 2 : récupère la fiche détaillée d'une carte et en extrait tous les
 * champs demandés. Ne fabrique jamais de valeur : un champ absent du HTML
 * reste `null`.
 */
export async function scrapeCardDetail(cardNumber: string): Promise<ScrapedCard> {
  const cardUrl = `${BASE}/cards/en/${cardNumber}`;
  const html = await politeFetch(cardUrl);
  const $ = cheerio.load(html);

  const name = $("h1, [class*=name]").first().text().trim() || $("title").text().split("(")[0].trim();

  // Bloc principal : "Character • Green • 5 Cost" / "6000 Power • Slash • +1000 Counter"
  // Les pages Leader ont un format différent : "Leader • Green • 5 Life" (pas de Cost).
  const mainText = $.root().text();

  const catColorCost = mainText.match(/(Character|Event|Stage)\s*•\s*([A-Za-z/]+)\s*•\s*(\d+)\s*Cost/);
  const catColorLife = mainText.match(/(Leader)\s*•\s*([A-Za-z/]+)\s*•\s*(\d+)\s*Life/);
  const category = catColorCost?.[1] ?? catColorLife?.[1] ?? "Unknown";
  const color = catColorCost?.[2] ?? catColorLife?.[2] ?? "Green";
  const cost = catColorCost ? parseInt(catColorCost[3], 10) : null; // les Leaders n'ont pas de coût — reste null volontairement

  const powerAttrCounter = mainText.match(
    /(\d+)\s*Power\s*•\s*([A-Za-z]+)(?:\s*•\s*\+(\d+)\s*Counter)?/
  );
  const power = powerAttrCounter ? parseInt(powerAttrCounter[1], 10) : null;
  const attribute = powerAttrCounter?.[2] ?? null;
  const counter = powerAttrCounter?.[3] ? parseInt(powerAttrCounter[3], 10) : 0;

  const rarityMatch = mainText.match(/\b(Common|Uncommon|Rare|Super Rare|Secret Rare|Leader|Promo)\b/);
  const rarity = rarityMatch?.[1] ?? null;

  const blockMatch = mainText.match(/Block\s*(\d+)/);
  const block = blockMatch ? `Block ${blockMatch[1]}` : null;

  const standardMatch = mainText.match(/Standard\s*(legal|illegal|banned)/i);
  const extraMatch = mainText.match(/Extra\s*(legal|illegal|banned)/i);
  const legalityStatus =
    standardMatch || extraMatch
      ? `Standard: ${standardMatch?.[1] ?? "?"} / Extra: ${extraMatch?.[1] ?? "?"}`
      : null;

  const imageUrl = $("img[src*='digitaloceanspaces']").first().attr("src") ?? "";

  const setMatch = cardNumber.match(/^([A-Z]+\d*)-/);
  const setCode = setMatch ? setMatch[1] : "UNKNOWN";

  // Le texte d'effet officiel est le paragraphe qui suit le bloc de stats et
  // précède la ligne "Illustrated by". On prend le texte le plus long parmi
  // les paragraphes candidats pour limiter les faux positifs.
  //
  // Le marqueur ([On Play], [Activate: Main]...) est cherché n'importe où
  // dans le paragraphe, pas seulement au tout début : beaucoup de Leaders
  // ont une clause passive avant leur capacité active, ex. Mihawk OP14-020
  // "If your opponent's Leader has the <Slash> attribute, this Leader
  // gains +1000 power. [Activate: Main] [Once Per Turn] ..." — un ancrage
  // strict en début de chaîne ratait systématiquement ce genre de texte
  // (100% des Leaders verts étaient concernés avant ce correctif).
  let officialText: string | null = null;
  let triggerText: string | null = null;
  $("p").each((_, el) => {
    const t = $(el).text().trim();
    if (!t) return;
    if (/^\[Trigger\]/i.test(t)) {
      triggerText = t.replace(/^\[Trigger\]\s*/i, "");
    } else if (
      /\[(On Play|When Attacking|Activate|Your Turn|On K\.O\.|DON!!|On Opponent's Attack|End of Your Turn)/i.test(t) &&
      (!officialText || t.length > officialText.length)
    ) {
      officialText = t;
    }
  });

  const types =
    $("a[href*='type%3A'], a[href*='type=']")
      .map((_, el) => $(el).text().trim())
      .get()
      .join("/") || "";

  return {
    cardNumber,
    name,
    category,
    color,
    setCode,
    rarity,
    cost,
    power,
    counter,
    attribute,
    types,
    officialText,
    triggerText,
    imageUrl,
    cardUrl,
    sourceUrl: cardUrl,
    releaseDate: null,
    legalityStatus,
    block,
    language: "en",
  };
}

/**
 * Teste l'importateur sur un petit échantillon (par défaut 5 cartes), sans
 * jamais écrire en base — utilisé pour l'étape de vérification obligatoire
 * avant tout import complet.
 */
export async function testScrapeSample(
  searchUrl: string,
  sampleSize = 5
): Promise<{ totalFoundOnSite: number; sample: ScrapedCard[]; errors: { cardNumber: string; error: string }[] }> {
  const { cardNumbers, totalFoundOnSite } = await listAllCardNumbers(searchUrl);
  const toTest = cardNumbers.slice(0, sampleSize);
  const sample: ScrapedCard[] = [];
  const errors: { cardNumber: string; error: string }[] = [];

  for (const num of toTest) {
    try {
      sample.push(await scrapeCardDetail(num));
    } catch (e: any) {
      errors.push({ cardNumber: num, error: e.message ?? String(e) });
    }
  }

  return { totalFoundOnSite, sample, errors };
}

// ---------------------------------------------------------------------------
// Decklists de tournoi ("OP16 Winning Decks")
// ---------------------------------------------------------------------------

export interface ScrapedTournamentRow {
  rawDecklist: string; // colonne "Deck Composition", format compact "1nOP14-020a4n..."
  deckColor: string;
  deckProfile: string;
  deckName: string;
  date: string;
  country: string;
  player: string;
  placementRaw: string;
  tournamentType: string;
  host: string;
}

/**
 * Parcourt le tableau HTML de la page de decklists OP16 et retourne CHAQUE
 * ligne brute (toutes couleurs confondues). Le filtre strict "op14mihawk"
 * est appliqué ensuite par l'appelant — jamais dans cette fonction, pour
 * garder le scraping et le filtrage séparés et vérifiables indépendamment.
 */
export async function scrapeTournamentDeckTable(pageUrl: string): Promise<ScrapedTournamentRow[]> {
  const html = await politeFetch(pageUrl);
  const $ = cheerio.load(html);
  const rows: ScrapedTournamentRow[] = [];

  $("table tr").each((_, tr) => {
    const tds = $(tr).find("td");
    if (tds.length < 11) return; // pas une ligne de données (en-tête, etc.)

    const rawDecklist = $(tds[0]).text().trim();
    if (!/^\d+n[A-Z0-9-]+/i.test(rawDecklist)) return; // ligne non exploitable

    rows.push({
      rawDecklist,
      deckColor: $(tds[2]).text().trim(),
      deckProfile: $(tds[3]).text().trim(),
      deckName: $(tds[4]).text().trim(),
      date: $(tds[5]).text().trim(),
      country: $(tds[6]).text().trim(),
      player: $(tds[7]).text().trim(),
      placementRaw: $(tds[8]).text().trim(),
      tournamentType: $(tds[9]).text().trim(),
      host: $(tds[10]).text().trim(),
    });
  });

  return rows;
}

/** Filtre strict Mihawk : profil op14mihawk ET Leader OP14-020 ET couleur Green. */
export function isStrictMihawkRow(row: ScrapedTournamentRow, leaderCardNumber: string): boolean {
  // Le format compact est "1nOP14-020a4nEB01-015a..." — après le numéro du
  // Leader vient toujours directement la lettre "a" (séparateur), jamais un
  // espace ni une fin de chaîne isolée. Un \b classique ne fonctionne pas ici
  // car "0" et "a" sont tous deux des caractères "mot" pour regex.
  const escaped = leaderCardNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (
    row.deckProfile.trim().toLowerCase() === "op14mihawk" &&
    row.deckColor.trim().toLowerCase() === "green" &&
    new RegExp(`^1n${escaped}a`, "i").test(row.rawDecklist.trim())
  );
}
