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
 * Variante de listAllCardNumbers() scopée sur UN SEUL SET, TOUTES COULEURS
 * confondues en une seule recherche (`set:XXX lang:en`, sans `color:`) —
 * plutôt que de balayer tous les sets pour une seule couleur. Beaucoup plus
 * rapide pour importer un set fraîchement sorti (~169 cartes pour OP17 par
 * exemple, contre ~2400+ pour un balayage complet des 6 couleurs), utile
 * juste après la sortie d'un nouveau set plutôt que d'attendre le prochain
 * import complet par couleur.
 *
 * Contrairement à listAllCardNumbers(), cette recherche dépasse la taille
 * d'une page par défaut du site (constaté : ~42 cartes/page pour un set
 * complet toutes couleurs) — la pagination (`&page=N`) est donc gérée ici
 * explicitement, en s'arrêtant dès qu'une page ne ramène plus aucun numéro
 * inédit (jamais un nombre de pages codé en dur, pour rester correct même
 * si la taille du set ou de la page change).
 */
export async function listCardNumbersForSet(
  setCode: string,
  onProgress?: (page: number) => void
): Promise<{ cardNumbers: string[]; totalFoundOnSite: number }> {
  const cardNumbers = new Set<string>();
  let totalFoundOnSite = 0;
  const MAX_PAGES = 20; // garde-fou — aucun set réel n'approche cette taille

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `${BASE}/cards/?q=${encodeURIComponent(`set:${setCode} lang:en display:grid sort:id`)}&page=${page}`;
    const html = await politeFetch(url);
    const $ = cheerio.load(html);

    if (page === 1) {
      const bodyText = $("body").text();
      const m = bodyText.match(/([\d,]+)\s+cards?\s+found/i);
      if (m) totalFoundOnSite = parseInt(m[1].replace(/,/g, ""), 10);
    }

    const before = cardNumbers.size;
    $("a[href*='/cards/']").each((_, el) => {
      const href = $(el).attr("href") || "";
      const m = href.match(/\/cards\/(?:en\/)?([A-Z0-9]+-\d+)/i);
      if (m) cardNumbers.add(m[1].toUpperCase());
    });
    onProgress?.(page);

    if (cardNumbers.size === before) break; // page sans rien de nouveau -> fin de pagination
  }

  return { cardNumbers: Array.from(cardNumbers), totalFoundOnSite: totalFoundOnSite || cardNumbers.size };
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

  // BUG CORRIGÉ (31/08/2026) : limitlesstcg.com a changé la structure de sa
  // page fiche carte — le texte d'effet n'est plus dans un <p> (l'ancien
  // sélecteur "$('p')" ne trouve plus RIEN, confirmé en inspectant une page
  // réelle en direct : le bloc actuel est un <div class="card-text-section">
  // à l'intérieur de <div class="card-text">). Sans ce correctif,
  // scrapeCardDetail() renvoyait officialText=null pour absolument toutes
  // les cartes, y compris Mihawk OP14-020 dont le texte était déjà correct
  // en base — un import relancé sur une carte déjà en base écrasait donc
  // silencieusement sa bonne valeur avec null (voir /api/import/batch, qui
  // ne préserve jamais l'ancienne valeur si le scraper renvoie null).
  //
  // Chaque carte a plusieurs .card-text-section (nom/id, stats, effet,
  // types, illustrateur...). On prend, parmi celles qui contiennent un
  // mot-clé de capacité connu ([On Play], [Main], [Counter], [Trigger]...),
  // la plus longue — même logique qu'avant, juste sur le bon sélecteur.
  // Le marqueur est cherché n'importe où dans le bloc, pas seulement en
  // tête : beaucoup de Leaders ont une clause passive avant leur capacité
  // active, ex. Mihawk OP14-020 "If your opponent's Leader has the <Slash>
  // attribute, this Leader gains +1000 power. [Activate: Main]...".
  // Un [Trigger] peut apparaître seul dans son propre bloc, OU accolé à la
  // suite du texte principal dans le même bloc (cartes Event avec [Main] +
  // [Trigger]) — les deux cas sont gérés.
  let officialText: string | null = null;
  let triggerText: string | null = null;
  $(".card-text-section").each((_, el) => {
    // Un <br> entre deux phrases (ex. clause passive puis capacité active
    // de Mihawk) ne produit aucun espace via .text() une fois retiré du
    // DOM : sans ce clone+remplacement, "power." et "[Activate" se
    // retrouvent collés ("power.[Activate"). Corrigé sur un clone, jamais
    // sur le DOM original de la page.
    const clone = $(el).clone();
    clone.find("br").replaceWith(" ");
    const raw = clone.text().replace(/\s+/g, " ").trim();
    if (!raw) return;
    const triggerMatch = raw.match(/\[Trigger\]\s*([\s\S]*)$/i);
    let text = raw;
    if (triggerMatch) {
      triggerText = triggerMatch[1].trim() || triggerText;
      if (/^\[Trigger\]/i.test(raw)) return; // bloc entièrement dédié au Trigger, rien d'autre à en tirer
      text = raw.slice(0, triggerMatch.index).trim();
    }
    if (
      /\[(On Play|When Attacking|Activate|Your Turn|On K\.O\.|DON!!|On Opponent's Attack|End of Your Turn|Main|Counter|Blocker|Rush|Double Attack|Banish)/i.test(
        text
      ) &&
      (!officialText || text.length > officialText.length)
    ) {
      officialText = text;
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
// Decklists de tournoi ("Winning Decks") — la fonction ci-dessous prend
// n'importe quelle URL de page onepiecetopdecks.com en paramètre (voir
// DEFAULT_URL dans les routes /api/tournament-decks/*), donc elle n'est pas
// figée sur un format particulier. Format actuellement pointé par défaut :
// OP17 "The World's Strongest Warriors" (mis à jour le 28/08/2026).
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
 * Parcourt le tableau HTML de la page de decklists (le format visé dépend
 * de l'URL passée en paramètre) et retourne CHAQUE ligne brute (toutes
 * couleurs confondues). Le filtre strict "op14mihawk" est appliqué ensuite
 * par l'appelant — jamais dans cette fonction, pour garder le scraping et
 * le filtrage séparés et vérifiables indépendamment.
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
