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
  // Contenu intégral en anglais — rempli seulement quand la source le fournit
  // gratuitement pendant le refresh (tcgprotectors, via son flux Atom).
  // null pour opdecks/shonentcg : voir fetchOpDecksArticleContent ci-dessous,
  // appelée à la demande par GET /api/learn/[id], jamais ici.
  content: string | null;
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

    // BUG CORRIGÉ (30/08/2026) : l'ancienne version remontait au plus proche
    // "article, li, section, div" englobant (closest()) et prenait TOUT son
    // texte — mais sur cette page, ce conteneur est en fait la grille qui
    // enveloppe PLUSIEURS cartes à la fois (pas de <li>/<article> par carte),
    // donc le titre/résumé d'une carte se retrouvait mélangé à ceux des
        // cartes voisines. Structure réelle vérifiée en direct dans le
    // navigateur (30/08/2026) : chaque carte est un unique <a> qui contient
    // directement <h2> (titre), <p> (résumé) et <span> ("Read article · N
    // min") — on lit donc CES enfants précis, jamais un texte aplati d'un
    // ancêtre partagé.
    const $el = $(el);
    const h2Text = cleanText($el.find("h2").first().text());
    const pText = cleanText($el.find("p").first().text());
    const spanText = cleanText($el.find("span").first().text());
    const fallbackText = cleanText($el.text());

    const title = h2Text || fallbackText || slug;
    const durationMatch = spanText.match(/(\d+)\s*min/i) || fallbackText.match(/(\d+)\s*min/i);
    const durationMinutes = durationMatch ? parseInt(durationMatch[1], 10) : null;
    const summary = pText.length >= 8 ? truncate(pText, 220) : null;

    out.push({
      url,
      source: "opdecks",
      sourceLabel: OPDECKS_SOURCE_LABEL,
      title,
      summary,
      content: null, // récupéré à la demande, voir fetchOpDecksArticleContent
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
// Contenu intégral d'un article opdecks.xyz — appelé UNIQUEMENT à la
// demande par GET /api/learn/[id] (jamais pendant /api/learn/refresh, pour
// rester largement sous la limite de temps d'une fonction Vercel même avec
// plusieurs dizaines d'articles en liste). Structure vérifiée en direct
// (30/08/2026) : <article> contient un <header> (titre + date/auteur, à
// ignorer) puis des enfants de contenu (<p>, <blockquote>, <h2>/<h3>,
// parfois un <div> pour un tableau) — on les linéarise en texte avec une
// légère mise en forme ("## " pour un sous-titre, "> " pour une citation)
// plutôt que de tout aplatir sans structure.
// ---------------------------------------------------------------------
export async function fetchOpDecksArticleContent(url: string): Promise<string | null> {
  try {
    const html = await politeFetchText(url);
    const $ = cheerio.load(html);
    const article = $("article").first();
    if (article.length === 0) return null;

    const lines: string[] = [];
    article
      .children()
      .not("header")
      .each((_, el) => {
        const tag = (el as any).tagName?.toLowerCase();
        const text = cleanText($(el).text());
        if (!text) return;
        if (tag === "h2" || tag === "h3") lines.push(`## ${text}`);
        else if (tag === "blockquote") lines.push(`> ${text}`);
        else lines.push(text);
      });

    const content = lines.join("\n\n").trim();
    return content.length >= 20 ? content : null;
  } catch {
    return null;
  }
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

    // Contenu intégral gratuit ici : le flux Atom fournit déjà tout le
    // corps de l'article dans <content> (souvent en HTML) — pas besoin
    // d'une requête séparée par article comme pour opdecks/shonentcg, donc
    // on le capture directement pendant le refresh plutôt qu'à la demande.
    const contentRaw = $(el).find("content").first().text();
    let content: string | null = null;
    if (contentRaw && contentRaw.length > (summaryRaw?.length ?? 0)) {
      const plainContent = cleanText(cheerio.load(contentRaw).text());
      if (plainContent.length >= 40) content = plainContent;
    }

    out.push({
      url: link,
      source: "tcgprotectors",
      sourceLabel: TCGPROTECTORS_SOURCE_LABEL,
      title,
      summary,
      content,
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
      content: null, // récupéré à la demande, voir fetchShonenTcgArticleContent
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

// ---------------------------------------------------------------------
// Contenu intégral d'un article shonentcg.com — appelé à la demande par
// GET /api/learn/[id], même principe que fetchOpDecksArticleContent.
// Structure DOM non documentée (site multi-jeux) : on essaie plusieurs
// sélecteurs usuels par ordre de préférence, et on renvoie null (jamais un
// texte fabriqué) si aucun ne donne un résultat exploitable — la page
// détail retombe alors sur le résumé + lien externe.
// ---------------------------------------------------------------------
export async function fetchShonenTcgArticleContent(url: string): Promise<string | null> {
  try {
    const html = await politeFetchText(url);
    const $ = cheerio.load(html);
    const candidates = ["article", "main", "[class*='prose']", "[class*='post-content']", "[class*='blog-content']"];
    for (const sel of candidates) {
      const el = $(sel).first();
      if (el.length === 0) continue;
      const paras = el
        .find("p, h2, h3, blockquote")
        .map((_, p) => {
          const tag = (p as any).tagName?.toLowerCase();
          const text = cleanText($(p).text());
          if (!text) return null;
          if (tag === "h2" || tag === "h3") return `## ${text}`;
          if (tag === "blockquote") return `> ${text}`;
          return text;
        })
        .get()
        .filter((t): t is string => !!t);
      const content = paras.join("\n\n").trim();
      if (content.length >= 60) return content;
    }
    return null;
  } catch {
    return null;
  }
}
