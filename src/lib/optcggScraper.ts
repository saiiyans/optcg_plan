/**
 * Importateur pour la 3e source de résultats de tournoi — OPTCG.GG
 * ("/deck-lists/top-decks"), complémentaire aux sources déjà intégrées :
 * Asie (onepiecetopdecks.com, voir scraper.ts) et US/International
 * (Limitless TCG, voir limitlessScraper.ts). Regroupée sous le même badge
 * "🌍 International" que Limitless côté lecture (voir regionOf() dans
 * src/app/api/tournament-decks/route.ts) — cette page ne donne aucune
 * indication de pays par résultat, donc rien n'est inventé pour la classer
 * "Asie".
 *
 * DIFFÉRENCE IMPORTANTE avec les 2 autres sources : contrairement à
 * onepiecetopdecks.com (HTML brut à parser) et Limitless (HTML à parser
 * avec double signal de quantité, jamais vérifié en conditions réelles),
 * OPTCG.gg expose une VRAIE API JSON pour le détail de chaque decklist —
 * https://www.optcg.gg/api/deck-lists/<id> — retournant les cartes une par
 * une (une entrée par exemplaire possédé, jamais de champ "quantity" à
 * deviner : la quantité = le nombre d'entrées avec le même id). Bien plus
 * fiable qu'un parsing HTML. VÉRIFIÉ EN CONDITIONS RÉELLES le 28/08/2026
 * via navigateur (page /deck-lists/top-decks + une decklist Mihawk
 * individuelle + son appel réseau JSON) avant d'écrire ce fichier —
 * structure confirmée, pas déduite d'une recherche externe.
 *
 * Le tableau des résultats récents ("Top Decks"), lui, n'a PAS d'API JSON
 * séparée observée : il est embarqué dans le HTML de la page comme
 * littéral JavaScript échappé (clé "initialDecks", payload React Server
 * Components de Next.js). extractInitialDecks() ci-dessous le retrouve par
 * recherche de la clé + appariement de crochets — si la clé disparaît un
 * jour (refonte du site), la fonction lève une erreur explicite plutôt que
 * de renvoyer silencieusement une liste vide.
 *
 * LIMITES HONNÊTES DE CETTE SOURCE :
 * - Pas de pays par résultat -> country toujours "—", jamais deviné.
 * - Pas de score W-L par résultat -> wins/losses toujours null.
 * - Juste un placement numérique brut (ex. 6, pas "Top 8" en toutes
 *   lettres). classifyOptcggPlacement() ci-dessous classe 2 à 8 comme
 *   "top_performer" en SUPPOSANT une coupe Top 8 — convention standard des
 *   cups TCG (dont les ChinoizeCup déjà vues dans l'app), mais cette
 *   hypothèse n'est PAS vérifiée événement par événement : à garder en tête
 *   si un jour une cup avec une coupe différente (Top 16, Top 4) apparaît
 *   dans les données.
 *
 * MÊME éthique de requête que les 2 scrapers voisins : fetch simple avec
 * User-Agent explicite identifiant un usage personnel non-commercial, délai
 * de politesse entre chaque requête, aucun contournement de protection.
 */

const BASE = "https://www.optcg.gg";
const REQUEST_DELAY_MS = 700; // délai de politesse entre deux requêtes
const USER_AGENT =
  "optcg-green-library/0.1 (personal non-commercial deck tool; contact: local-user)";

export const OPTCGG_TOP_DECKS_URL = `${BASE}/deck-lists/top-decks`;
export const LEADER_CARD_NUMBER = "OP14-020";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function politeFetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "text/html" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} en récupérant ${url}`);
  const text = await res.text();
  await sleep(REQUEST_DELAY_MS);
  return text;
}

async function politeFetchJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} en récupérant ${url}`);
  const json = await res.json();
  await sleep(REQUEST_DELAY_MS);
  return json;
}

/**
 * Retrouve le tableau "initialDecks" dans le HTML brut de la page Top Decks
 * (littéral JS échappé, payload RSC de Next.js) et le décode. N'essaie
 * jamais de "réparer" une structure inattendue : une clé manquante ou des
 * crochets non appariés lèvent une erreur explicite.
 */
function extractInitialDecks(html: string): any[] {
  const idx = html.indexOf("initialDecks");
  if (idx === -1) {
    throw new Error('Clé "initialDecks" introuvable dans la page — structure du site probablement changée.');
  }
  const arrStart = html.indexOf("[", idx);
  if (arrStart === -1) {
    throw new Error('Tableau "initialDecks" introuvable juste après la clé.');
  }
  let depth = 0;
  let end = -1;
  for (let i = arrStart; i < html.length; i++) {
    if (html[i] === "[") depth++;
    else if (html[i] === "]") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) {
    throw new Error('Tableau "initialDecks" mal formé (crochets non appariés).');
  }
  // Le payload RSC échappe chaque guillemet (\") ; le contenu utile
  // (identifiants, noms, dates) ne contient lui-même aucun antislash, donc
  // les retirer tous est fiable ici pour retomber sur du JSON valide.
  const raw = html.slice(arrStart, end + 1).replace(/\\/g, "");
  return JSON.parse(raw);
}

export interface OptcggResultRow {
  id: string;
  leaderRaw: string; // ex. "[OP14-020] Dracule Mihawk"
  placement: number | null;
  player: string;
  eventName: string;
  eventDate: string; // ISO yyyy-mm-dd
  format: string;
  listUrl: string; // page humaine /deck-lists/<id>
  apiUrl: string; // API JSON /api/deck-lists/<id>
}

/**
 * Récupère la liste des résultats récents affichés sur /deck-lists/top-decks
 * (tous leaders confondus — filtrer ensuite avec isMihawkLeader).
 */
export async function scrapeOptcggResults(pageUrl: string): Promise<OptcggResultRow[]> {
  const html = await politeFetchText(pageUrl);
  const decks = extractInitialDecks(html);

  return decks
    .map((d: any) => ({
      id: typeof d.id === "string" ? d.id : "",
      leaderRaw: typeof d.leader === "string" ? d.leader : "",
      placement: typeof d.placement === "number" ? d.placement : null,
      player: typeof d.player === "string" ? d.player : "",
      eventName: typeof d.event_name === "string" ? d.event_name : "",
      eventDate: typeof d.event_date === "string" ? d.event_date.slice(0, 10) : "",
      format: typeof d.format === "string" ? d.format : "OP?",
      listUrl: `${BASE}/deck-lists/${d.id}`,
      apiUrl: `${BASE}/api/deck-lists/${d.id}`,
    }))
    .filter((r) => r.id && r.player && r.eventDate); // ligne incomplète -> ignorée proprement, jamais complétée à la devinette
}

export function isMihawkLeader(leaderRaw: string): boolean {
  return leaderRaw.toUpperCase().includes(LEADER_CARD_NUMBER);
}

export interface OptcggCardEntry {
  cardNumber: string;
  quantity: number;
}

export interface OptcggDeckList {
  leader: OptcggCardEntry | null;
  cards: OptcggCardEntry[];
  totalNonLeader: number;
  valid: boolean;
  errors: string[];
  // Reconstruite au même format compact que les 2 autres sources
  // ("1nOP14-020a4nEB01-015a...") pour rester ré-analysable ailleurs dans
  // l'app si besoin — jamais un texte brut copié du site (cette source
  // n'expose pas ce format, seulement du JSON structuré).
  rawDecklistCompact: string;
}

/**
 * Récupère et parse une decklist individuelle via l'API JSON — pas de
 * HTML à interpréter. Chaque carte non-Leader apparaît une fois par
 * exemplaire possédé (l'API ne fournit pas de champ "quantity" séparé) ;
 * la quantité est donc simplement le nombre d'entrées partageant le même
 * identifiant. Le Leader (type "LEADER") est toujours compté 1, jamais la
 * valeur scrapée, par règle du jeu.
 */
export async function scrapeOptcggDecklist(apiUrl: string): Promise<OptcggDeckList> {
  const data = await politeFetchJson(apiUrl);
  const errors: string[] = [];
  const rawCards: any[] = Array.isArray(data.cards) ? data.cards : [];

  let leader: OptcggCardEntry | null = null;
  const counts = new Map<string, number>();

  for (const c of rawCards) {
    const code =
      typeof c.id === "string" ? c.id.toUpperCase() : typeof c.base_id === "string" ? c.base_id.toUpperCase() : null;
    if (!code) {
      errors.push("Carte sans identifiant lisible dans la réponse API");
      continue;
    }
    if (c.type === "LEADER") {
      leader = { cardNumber: code, quantity: 1 };
      continue;
    }
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }

  const cards: OptcggCardEntry[] = Array.from(counts.entries()).map(([cardNumber, quantity]) => ({
    cardNumber,
    quantity,
  }));
  for (const c of cards) {
    if (c.quantity > 4) errors.push(`${c.cardNumber} a ${c.quantity} exemplaires (max 4)`);
  }

  const totalNonLeader = cards.reduce((s, c) => s + c.quantity, 0);
  if (!leader) errors.push("Aucune carte de type LEADER trouvée dans la réponse API");
  if (totalNonLeader !== 50) errors.push(`Total hors Leader = ${totalNonLeader} au lieu de 50`);

  const rawDecklistCompact = [leader ? `1n${leader.cardNumber}` : "", ...cards.map((c) => `${c.quantity}n${c.cardNumber}`)]
    .filter(Boolean)
    .join("a");

  return { leader, cards, totalNonLeader, valid: errors.length === 0, errors, rawDecklistCompact };
}

function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

export interface OptcggPlacementInfo {
  status: "winner" | "top_performer" | "unverified";
  proofLevel: "gold" | "silver" | "bronze" | null;
  placementRaw: string;
}

/** Voir la note "LIMITES HONNÊTES" en haut de fichier sur l'hypothèse Top 8. */
export function classifyOptcggPlacement(placement: number | null): OptcggPlacementInfo {
  if (placement === null) return { status: "unverified", proofLevel: null, placementRaw: "NA" };
  const placementRaw = `${ordinal(placement)} Place`;
  if (placement === 1) return { status: "winner", proofLevel: "gold", placementRaw };
  if (placement <= 8) return { status: "top_performer", proofLevel: placement <= 4 ? "silver" : "bronze", placementRaw };
  return { status: "unverified", proofLevel: null, placementRaw };
}

export interface OptcggTestSample {
  id: string;
  player: string;
  placement: number | null;
  placementRaw: string;
  eventName: string;
  eventDate: string;
  format: string;
  parsedLeader: OptcggCardEntry | null;
  cardCountNonLeader: number;
  parseErrors: string[];
  parseValid: boolean;
}

/**
 * Teste le parseur sur un petit échantillon (3 par défaut) de résultats
 * Mihawk, sans jamais écrire en base — même étape de vérification
 * obligatoire que pour les 2 autres sources avant tout import réel.
 */
export async function testOptcggSample(
  pageUrl: string,
  sampleSize = 3
): Promise<{
  totalRowsFound: number;
  mihawkRowsFound: number;
  sample: OptcggTestSample[];
  errors: { row: string; error: string }[];
}> {
  const rows = await scrapeOptcggResults(pageUrl);
  const mihawkRows = rows.filter((r) => isMihawkLeader(r.leaderRaw));
  const toTest = mihawkRows.slice(0, sampleSize);
  const sample: OptcggTestSample[] = [];
  const errors: { row: string; error: string }[] = [];

  for (const row of toTest) {
    try {
      const parsed = await scrapeOptcggDecklist(row.apiUrl);
      const placement = classifyOptcggPlacement(row.placement);
      sample.push({
        id: row.id,
        player: row.player,
        placement: row.placement,
        placementRaw: placement.placementRaw,
        eventName: row.eventName,
        eventDate: row.eventDate,
        format: row.format,
        parsedLeader: parsed.leader,
        cardCountNonLeader: parsed.totalNonLeader,
        parseErrors: parsed.errors,
        parseValid: parsed.valid,
      });
    } catch (e: any) {
      errors.push({ row: `${row.player} ${row.eventDate}`, error: e.message ?? String(e) });
    }
  }

  return { totalRowsFound: rows.length, mihawkRowsFound: mihawkRows.length, sample, errors };
}
