import * as cheerio from "cheerio";

/**
 * Importateur pour les résultats de tournoi "US / International" —
 * complète la source "Asie" (onepiecetopdecks.com, voir scraper.ts plus
 * bas dans ce même dossier) avec les résultats suivis par Limitless TCG.
 *
 * PRÉCISION IMPORTANTE sur le nom "US" utilisé dans l'UI (à la demande du
 * joueur) : la page Limitless suivie ici agrège en réalité des résultats
 * du monde entier hors Asie — Regionals/Treasure Cups vus lors de la
 * recherche : Wolverhampton et Peoria mais aussi Utrecht, Bielefeld,
 * Toronto, Barcelona, Warsaw, São Paulo. "US/International" est donc plus
 * exact que "US" seul seul ; gardé dans le libellé UI pour rester lisible
 * au premier coup d'oeil, mais jamais présenté comme des résultats
 * exclusivement américains.
 *
 * MÊMES RÈGLES que le scraper de cartes de scraper.ts : requêtes HTTP
 * classiques (fetch) avec User-Agent explicite identifiant un usage
 * personnel non-commercial, délai de politesse entre chaque requête,
 * aucun contournement de protection.
 *
 * LIMITE HONNÊTE À CONNAÎTRE : contrairement au scraper de cartes plus haut
 * dans ce fichier voisin (dont les sélecteurs ont pu être vérifiés en
 * conditions réelles), le parseur de decklists individuelles ci-dessous n'a
 * PAS pu être testé contre le HTML réel du site depuis cet environnement
 * (accès réseau sortant bloqué en sandbox — confirmé aussi bien sur
 * onepiecetopdecks.com que sur limitlesstcg.com). Sa structure a été déduite
 * d'une recherche externe (colonnes du tableau de résultats, présence de
 * codes carte + quantités sur les pages de decklist, format de date "19th
 * July 2026 - Treasure Cup Wolverhampton"), pas observée directement.
 * Conçu défensivement en conséquence : double signal de quantité
 * (occurrences du lien carte + nombre en tête du texte du conteneur) et
 * invariant strict "50 cartes hors Leader exactement" — toute incohérence
 * bascule la liste en "needs_review" plutôt que de deviner un nombre.
 * À VÉRIFIER avec "Tester sur 3 decklists" avant tout import réel.
 */

const BASE = "https://onepiece.limitlesstcg.com";
const REQUEST_DELAY_MS = 700; // délai de politesse entre deux requêtes
const USER_AGENT =
  "optcg-green-library/0.1 (personal non-commercial deck tool; contact: local-user)";

export const LIMITLESS_ARCHETYPE_URL = `${BASE}/decks/86`; // archétype Green Mihawk (OP14-020)
export const LEADER_CARD_NUMBER = "OP14-020";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function politeFetch(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "text/html" } });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} en récupérant ${url}`);
  }
  const html = await res.text();
  await sleep(REQUEST_DELAY_MS);
  return html;
}

export interface LimitlessResultRow {
  format: string; // "OP16", "OP17"... — "OP?" si non détecté
  placementRaw: string; // "23rd", "1st"... — "NA" si non détecté
  player: string;
  listUrl: string; // URL absolue vers /decks/list/NNNN
  tournamentName: string;
  date: string; // ISO yyyy-mm-dd, toujours reparsé (jamais le texte brut "M/J/AAAA" — voir le bug corrigé sur la source Asie)
}

const ORDINAL_DATE_RE = /(\d{1,2})(?:st|nd|rd|th)\s+([A-Za-z]+)\s+(\d{4})\s*-\s*(.+)/;
const PLACEMENT_RE = /^\d{1,2}(?:st|nd|rd|th)$/i;
const FORMAT_RE = /^OP\d{1,2}$/i;

function parseTournamentText(raw: string): { date: string | null; tournamentName: string | null } {
  const m = raw.match(ORDINAL_DATE_RE);
  if (!m) return { date: null, tournamentName: null };
  const [, day, month, year, name] = m;
  const d = new Date(`${day} ${month} ${year}`);
  return {
    date: Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : null,
    tournamentName: name.trim(),
  };
}

/**
 * Parcourt la page "Latest results" d'un archétype Limitless et retourne
 * chaque ligne. Classification CELLULE PAR CELLULE (jamais le texte de la
 * ligne entière concaténé) : chaque <td> est testé contre un pattern précis
 * (placement / format / lien joueur / lien decklist / date+tournoi) plutôt
 * que de supposer un ordre de colonnes fixe — plus robuste si le site
 * change l'ordre ou ajoute une colonne.
 */
export async function scrapeLimitlessResults(pageUrl: string): Promise<LimitlessResultRow[]> {
  const html = await politeFetch(pageUrl);
  const $ = cheerio.load(html);
  const rows: LimitlessResultRow[] = [];

  $("table tr").each((_, tr) => {
    const $tr = $(tr);
    const listLink = $tr.find("a[href*='/decks/list/']").first();
    if (listLink.length === 0) return; // pas une ligne de résultat exploitable

    let listUrl = listLink.attr("href") || "";
    if (listUrl.startsWith("/")) listUrl = BASE + listUrl;

    const player = $tr.find("a[href*='/players/']").first().text().trim();

    let placementRaw = "";
    let format = "";
    let date: string | null = null;
    let tournamentName: string | null = null;

    $tr.find("td").each((_, td) => {
      const text = $(td).text().trim();
      if (!text) return;
      if (!placementRaw && PLACEMENT_RE.test(text)) {
        placementRaw = text;
      } else if (!format && FORMAT_RE.test(text)) {
        format = text.toUpperCase();
      } else if (!date) {
        const parsed = parseTournamentText(text);
        if (parsed.date) {
          date = parsed.date;
          tournamentName = parsed.tournamentName;
        }
      }
    });

    if (!player || !listUrl || !date) return; // ligne incomplète — ignorée proprement, jamais complétée à la devinette

    rows.push({
      format: format || "OP?",
      placementRaw: placementRaw || "NA",
      player,
      listUrl,
      tournamentName: tournamentName || "Limitless",
      date,
    });
  });

  return rows;
}

export interface LimitlessCardEntry {
  cardNumber: string;
  quantity: number;
}

export interface LimitlessDeckList {
  leader: LimitlessCardEntry | null;
  cards: LimitlessCardEntry[];
  totalNonLeader: number;
  valid: boolean;
  errors: string[];
  // Reconstruite au même format compact que onepiecetopdecks.com
  // ("1nOP14-020a4nEB01-015a...") pour rester ré-analysable par
  // parseCompactDecklist ailleurs dans l'app si besoin un jour — jamais un
  // texte brut copié du site (qui n'existe pas sous cette forme côté
  // Limitless), une reconstruction fidèle au parsing ci-dessus.
  rawDecklistCompact: string;
}

const CARD_LINK_RE = /\/cards\/(?:en\/)?([A-Z0-9]+-\d+)/i;

/**
 * Récupère et parse une decklist individuelle Limitless. Double signal pour
 * la quantité de chaque carte : nombre en tête du texte du conteneur le
 * plus proche du lien carte (jusqu'à 2 niveaux de parent), sinon nombre
 * d'occurrences du même lien sur la page. Si les deux signaux se
 * contredisent (plusieurs valeurs de texte différentes trouvées) ou si le
 * total hors Leader ne tombe pas exactement sur 50, la liste est marquée
 * needs_review — jamais de quantité inventée ou corrigée en silence.
 */
export async function scrapeLimitlessDecklist(listUrl: string): Promise<LimitlessDeckList> {
  const html = await politeFetch(listUrl);
  const $ = cheerio.load(html);
  const errors: string[] = [];

  const occurrenceCount = new Map<string, number>();
  const containerQuantities = new Map<string, number[]>();

  $("a[href*='/cards/']").each((_, el) => {
    const href = $(el).attr("href") || "";
    const m = href.match(CARD_LINK_RE);
    if (!m) return;
    const code = m[1].toUpperCase();
    occurrenceCount.set(code, (occurrenceCount.get(code) ?? 0) + 1);

    let container = $(el).parent();
    for (let depth = 0; depth < 3; depth++) {
      const text = container.text().trim();
      const qm = text.match(/^(\d{1,2})\b/);
      if (qm) {
        const n = parseInt(qm[1], 10);
        if (n >= 1 && n <= 4) {
          const arr = containerQuantities.get(code) ?? [];
          arr.push(n);
          containerQuantities.set(code, arr);
          break;
        }
      }
      container = container.parent();
      if (container.length === 0) break;
    }
  });

  const cards: LimitlessCardEntry[] = [];
  let leader: LimitlessCardEntry | null = null;

  for (const [code, occurrences] of occurrenceCount) {
    const seenQuantities = Array.from(new Set(containerQuantities.get(code) ?? []));
    let quantity: number | null = null;
    if (seenQuantities.length === 1) {
      quantity = seenQuantities[0];
    } else if (seenQuantities.length === 0 && occurrences >= 1 && occurrences <= 4) {
      quantity = occurrences;
    } else {
      errors.push(`${code} : quantité ambiguë (occurrences=${occurrences}, texte=${seenQuantities.join("/") || "aucun"})`);
      continue;
    }

    if (code === LEADER_CARD_NUMBER) {
      leader = { cardNumber: code, quantity: 1 }; // le Leader est toujours 1 exemplaire par règle du jeu, jamais la valeur scrapée
    } else {
      cards.push({ cardNumber: code, quantity });
    }
  }

  const totalNonLeader = cards.reduce((s, c) => s + c.quantity, 0);
  if (!leader) errors.push(`Leader ${LEADER_CARD_NUMBER} non trouvé sur la page`);
  if (totalNonLeader !== 50) errors.push(`Total hors Leader = ${totalNonLeader} au lieu de 50`);

  const rawDecklistCompact = [leader ? `1n${leader.cardNumber}` : "", ...cards.map((c) => `${c.quantity}n${c.cardNumber}`)]
    .filter(Boolean)
    .join("a");

  return { leader, cards, totalNonLeader, valid: errors.length === 0, errors, rawDecklistCompact };
}

export interface LimitlessTestSample {
  format: string;
  placementRaw: string;
  player: string;
  listUrl: string;
  tournamentName: string;
  date: string;
  parsedLeader: LimitlessCardEntry | null;
  cardCountNonLeader: number;
  parseErrors: string[];
  parseValid: boolean;
}

/**
 * Teste le parseur sur un petit échantillon (3 par défaut), sans jamais
 * écrire en base — étape de vérification obligatoire avant tout import
 * complet, identique dans l'esprit à testScrapeSample (scraper.ts) et à
 * l'étape "1. Tester sur 3 decklists" déjà existante côté onepiecetopdecks.
 */
export async function testLimitlessSample(
  pageUrl: string,
  sampleSize = 3
): Promise<{ totalRowsFound: number; sample: LimitlessTestSample[]; errors: { row: string; error: string }[] }> {
  const rows = await scrapeLimitlessResults(pageUrl);
  const toTest = rows.slice(0, sampleSize);
  const sample: LimitlessTestSample[] = [];
  const errors: { row: string; error: string }[] = [];

  for (const row of toTest) {
    try {
      const parsed = await scrapeLimitlessDecklist(row.listUrl);
      sample.push({
        format: row.format,
        placementRaw: row.placementRaw,
        player: row.player,
        listUrl: row.listUrl,
        tournamentName: row.tournamentName,
        date: row.date,
        parsedLeader: parsed.leader,
        cardCountNonLeader: parsed.totalNonLeader,
        parseErrors: parsed.errors,
        parseValid: parsed.valid,
      });
    } catch (e: any) {
      errors.push({ row: `${row.player} ${row.date}`, error: e.message ?? String(e) });
    }
  }

  return { totalRowsFound: rows.length, sample, errors };
}
