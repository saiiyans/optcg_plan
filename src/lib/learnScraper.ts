import * as cheerio from "cheerio";

/**
 * Rubrique "Apprentissage" — agrège en direct des articles de stratégie
 * OPTCG depuis plusieurs sites, jamais un contenu écrit à la main. Chaque
 * source a sa propre fonction, indépendante : si un site change de
 * structure ou est injoignable, seule SA fonction échoue (voir le
 * try/catch par source dans /api/learn/refresh), les autres sources
 * continuent de s'actualiser normalement — même principe que les tier
 * lists (opTopDecksTierScraper.ts, cardKaizokuTierScraper.ts).
 *
 * Même politesse réseau que scraper.ts : User-Agent explicite, une seule
 * requête HTTP par source (pas de balayage massif), lecture de HTML/XML
 * public exactement comme un navigateur.
 */

const USER_AGENT =
  "optcg-mihawk-coach/0.1 (personal non-commercial learning tool; contact: local-user)";

async function politeFetchText(url: string, accept = "text/html"): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: accept } });
  if (!res.ok) throw new Error(`HTTP ${res.status} en récupérant ${url}`);
  return res.text();
}

export type LearnSource = "opdecks" | "tcgprotectors" | "shonentcg";

export interface LearnArticleRaw {
  url: string;
  source: LearnSource;
  sourceLabel: string;
  title: string;
  summary: string | null;
  durationMinutes: number | null;
  publishedAt: string | null; // ISO, ou null si le site ne fournit aucune date fiable
  isPillar: boolean;
  order: number;
}

function cleanText(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1).trim() + "…" : s;
}

// ---------------------------------------------------------------------
// Source 1 — opdecks.xyz/learn : petite liste statique d'articles
// fondamentaux, réutilisant les 4 mêmes URLs que le joueur a désignées
// comme base de la méthodologie du coach (voir PILLAR_SLUGS). Le site ne
// publie ni date ni auteur — capturedAt (mis à jour à chaque scrape) sert
// de repère de fraîcheur, jamais une date fabriquée.
// ---------------------------------------------------------------------
export const OPDECKS_LEARN_URL = "https://opdecks.xyz/learn";
export const OPDECKS_SOURCE_LABEL = "opdecks.xyz/learn — fondamentaux OPTCG (2K Rule, DON!!, erreurs de débutant, glossaire)";

const PILLAR_SLUGS = new Set([
  "optcg-2k-rule-attack-math",
  "don-economy",
  "optcg-beginner-mistakes",
  "optcg-glossary",
]);

export async function fetchOpDecksLearnArticles(): Promise<LearnArticleRaw[]> {
  const html = await politeFetchText(OPDECKS_LEARN_URL);
  const $ = cheerio.load(html);

  const seen = new Set<string>();
  const out: LearnArticleRaw[] = [];
  let order = 0;

  $("a").each((_, el) => {
    const hrefRaw = $(el).attr("href") || "";
    const m = hrefRaw.match(/\/learn\/([a-z0-9][a-z0-9-]*)\/?$/i);
    if (!m) return;
    const slug = m[1].toLowerCase();
    const url = `https://opdecks.xyz/learn/${slug}`;
    if (seen.has(url)) return;
    seen.add(url);

    // Structure de carte inconnue côté DOM (pas de classes stables
    // documentées) : on prend le texte du lien comme titre, et le texte
    // du plus proche conteneur de bloc pour repérer une éventuelle durée
    // de lecture ("X min") et un court résumé — jamais fabriqués si
    // absents.
    let title = cleanText($(el).text());
    const container = $(el).closest("article, li, section, div").first();
    const containerText = cleanText(container.length ? container.text() : title);
    if (title.length < 3 && containerText.length >= 3) title = containerText;

    const durationMatch = containerText.match(/(\d+)\s*min/i);
    const durationMinutes = durationMatch ? parseInt(durationMatch[1], 10) : null;

    let summary: string | null = null;
    if (containerText.length > title.length + 8) {
      let rest = containerText.replace(title, "");
      if (durationMatch) rest = rest.replace(durationMatch[0], "");
      rest = cleanText(rest);
      if (rest.length >= 8) summary = truncate(rest, 220);
    }

    out.push({
      url,
      source: "opdecks",
      sourceLabel: OPDECKS_SOURCE_LABEL,
      title: title || slug,
      summary,
      durationMinutes,
      publishedAt: null,
      isPillar: PILLAR_SLUGS.has(slug),
      order: order++,
    });
  });

  if (out.length === 0) {
    throw new Error(
      "Aucun article trouvé sur opdecks.xyz/learn — le site a peut-être changé de structure ou est injoignable."
    );
  }
  return out;
}

// ---------------------------------------------------------------------
// Source 2 — tcgprotectors.com, blog dédié One Piece TCG avec un vrai
// flux Atom standard Shopify (dates de publication fiables, pas de
// devinette de structure HTML). https://tcgprotectors.com/blogs/one-piece-tcg-blog
// ---------------------------------------------------------------------
export const TCGPROTECTORS_ATOM_URL = "https://tcgprotectors.com/blogs/one-piece-tcg-blog.atom";
export const TCGPROTECTORS_SOURCE_LABEL = "tcgprotectors.com — blog One Piece TCG (guides deck, règles, collection)";

export async function fetchTcgProtectorsLearnArticles(): Promise<LearnArticleRaw[]> {
  const xml = await politeFetchText(TCGPROTECTORS_ATOM_URL, "application/atom+xml, text/xml");
  const $ = cheerio.load(xml, { xmlMode: true });

  const out: LearnArticleRaw[] = [];
  let order = 0;

  $("entry").each((_, el) => {
    const title = cleanText($(el).find("title").first().text());
    const link =
      $(el).find("link[rel='alternate']").first().attr("href") || $(el).find("link").first().attr("href") || "";
    if (!title || !link) return;

    const dateRaw = $(el).find("published").first().text() || $(el).find("updated").first().text();
    const publishedAt = dateRaw && !isNaN(Date.parse(dateRaw)) ? new Date(dateRaw).toISOString() : null;

    const summaryRaw = $(el).find("summary").first().text() || $(el).find("content").first().text();
    let summary: string | null = null;
    if (summaryRaw) {
      const plain = cleanText(cheerio.load(summaryRaw).text());
      if (plain.length >= 8) summary = truncate(plain, 220);
    }

    out.push({
      url: link,
      source: "tcgprotectors",
      sourceLabel: TCGPROTECTORS_SOURCE_LABEL,
      title,
      summary,
      durationMinutes: null,
      publishedAt,
      isPillar: false,
      order: order++,
    });
  });

  if (out.length === 0) {
    throw new Error(
      "Aucune entrée trouvée dans le flux Atom de tcgprotectors.com — le flux a peut-être changé de format ou est injoignable."
    );
  }
  return out;
}

// ---------------------------------------------------------------------
// Source 3 — shonentcg.com/blog : blog multi-jeux (One Piece, Lorcana,
// Dragon Ball Fusion World...), pas de flux dédié One Piece trouvé — on
// filtre donc par mots-clés dans le titre/lien. Pas de date fiable
// extraite du HTML de liste (structure non documentée) : l'ordre
// d'apparition sur la page (du plus récent au plus ancien, confirmé sur
// le site) sert de tri, jamais une date devinée.
// ---------------------------------------------------------------------
export const SHONENTCG_BLOG_URL = "https://www.shonentcg.com/blog";
export const SHONENTCG_SOURCE_LABEL = "shonentcg.com — actus & guides multi-TCG, filtré sur One Piece / OP17";
const SHONENTCG_MAX_ARTICLES = 8;
const ONE_PIECE_KEYWORDS = /one piece|optcg|\bop-?\d{1,3}\b|don!!/i;

export async function fetchShonenTcgLearnArticles(): Promise<LearnArticleRaw[]> {
  const html = await politeFetchText(SHONENTCG_BLOG_URL);
  const $ = cheerio.load(html);

  const seen = new Set<string>();
  const out: LearnArticleRaw[] = [];
  let order = 0;

  $("a[href*='/blog/']").each((_, el) => {
    if (out.length >= SHONENTCG_MAX_ARTICLES) return;
    const hrefRaw = $(el).attr("href") || "";
    const m = hrefRaw.match(/\/blog\/([a-z0-9][a-z0-9-]*)\/?$/i);
    if (!m) return;
    const slug = m[1].toLowerCase();
    const url = `https://www.shonentcg.com/blog/${slug}`;
    if (seen.has(url)) return;

    const title = cleanText($(el).text());
    if (title.length < 3) return;
    if (!ONE_PIECE_KEYWORDS.test(title) && !ONE_PIECE_KEYWORDS.test(slug)) return;

    seen.add(url);
    out.push({
      url,
      source: "shonentcg",
      sourceLabel: SHONENTCG_SOURCE_LABEL,
      title,
      summary: null,
      durationMinutes: null,
      publishedAt: null,
      isPillar: false,
      order: order++,
    });
  });

  // Contrairement aux deux autres sources, une liste vide ici est un cas
  // normal (aucun article One Piece récent dans le blog au moment du
  // scrape) et pas forcément un signe de structure cassée — ne jamais
  // lever d'erreur pour ça, juste renvoyer un tableau vide.
  return out;
}
