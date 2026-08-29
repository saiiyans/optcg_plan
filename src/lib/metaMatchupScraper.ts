import * as cheerio from "cheerio";

/**
 * Récupère la grille de matchups (leader vs leader) de la méta actuelle
 * depuis une source publique externe — PAS depuis les propres parties du
 * joueur (ça, c'est /matchups + Match.trainingPhase, complètement séparé).
 *
 * IMPORTANT — à lire avant de modifier ce module :
 * - Source : https://opdecks.xyz/winmatrix — données agrégées par
 *   "TCG Match Making" depuis leur simulateur en ligne classé (voir la
 *   page elle-même : "Matchup data by TCG Match Making — ranked results
 *   from their matchmaking client"). Ce ne sont pas des résultats de
 *   tournoi, mais du ladder en ligne à gros volume — traité comme tel
 *   dans l'UI (jamais présenté comme une vérité absolue).
 * - Ce module lit du HTML public exactement comme le ferait un
 *   navigateur, avec un User-Agent explicite identifiant l'usage comme
 *   personnel et non-commercial. Il n'automatise aucun contournement de
 *   protection. Vérifie les conditions d'utilisation du site avant un
 *   usage intensif — ce scraper n'est déclenché QUE par un clic manuel
 *   sur "Actualiser" (jamais en tâche de fond), pour rester correct
 *   vis-à-vis du site source.
 * - L'attribution ("Source : ...") doit rester visible dans l'UI partout
 *   où ces données sont affichées — ce ne sont pas nos données.
 * - Si la structure de la page source change, ce parseur doit échouer
 *   PROPREMENT (erreur claire) plutôt que renvoyer des données fausses
 *   ou à moitié vides sans le signaler — cohérent avec le principe
 *   général de l'appli : ne jamais fabriquer une statistique.
 */

const SOURCE_URL = "https://opdecks.xyz/winmatrix";
const SOURCE_LABEL = "One Piece Decks — données TCG Match Making (ladder en ligne classé)";
const USER_AGENT =
  "optcg-green-library/0.1 (personal non-commercial coaching tool; contact: local-user)";

export interface MetaLeader {
  name: string;
  cardNumber: string;
}

export interface MetaMatchupData {
  leaders: MetaLeader[];
  // matrix[rowCardNumber][colCardNumber] = % de victoire du leader "row"
  // face au leader "col", ou null si non disponible (y compris miroir).
  matrix: Record<string, Record<string, number | null>>;
  sourceLabel: string;
  sourceUrl: string;
  totalGamesLabel: string | null;
}

function parseNameAndCardNumber(title: string): MetaLeader | null {
  const m = title.match(/^(.*)\s+\(([^)]+)\)\s*$/);
  if (!m) return null;
  return { name: m[1].trim(), cardNumber: m[2].trim().toUpperCase() };
}

/**
 * Parse le HTML de la page winmatrix. Séparé de `fetchMetaMatchups` pour
 * pouvoir être testé sans réseau (voir scripts/test-meta-matchup-parser.ts).
 */
export function parseWinMatrixHtml(html: string): MetaMatchupData {
  const $ = cheerio.load(html);
  const table = $('table[data-testid="winmatrix-table"]').first();
  if (table.length === 0) {
    throw new Error(
      "Structure de la page source introuvable (tableau winmatrix absent) — le site a probablement changé de mise en page, ce parseur doit être mis à jour."
    );
  }

  const leaders: MetaLeader[] = [];
  table.find("thead tr th a[title]").each((_, el) => {
    const parsed = parseNameAndCardNumber($(el).attr("title") || "");
    if (parsed) leaders.push(parsed);
  });
  if (leaders.length === 0) {
    throw new Error("Aucun leader trouvé dans l'en-tête du tableau source.");
  }

  const matrix: Record<string, Record<string, number | null>> = {};
  table.find("tbody tr").each((_, rowEl) => {
    const row = $(rowEl);
    const rowLeader = parseNameAndCardNumber(row.find("th a[title]").first().attr("title") || "");
    if (!rowLeader) return;
    const rowData: Record<string, number | null> = {};
    row.find("td").each((i, cellEl) => {
      const colLeader = leaders[i];
      if (!colLeader) return;
      const text = $(cellEl).text().trim();
      const pct = text.endsWith("%") ? parseFloat(text) : NaN;
      rowData[colLeader.cardNumber] = Number.isFinite(pct) ? pct : null;
    });
    matrix[rowLeader.cardNumber] = rowData;
  });

  if (Object.keys(matrix).length === 0) {
    throw new Error("Aucune ligne de matchup trouvée dans le tableau source.");
  }

  const bodyText = $("body").text();
  const gamesMatch = bodyText.match(/([\d,]{3,})\s+leader-games logged/i);
  const totalGamesLabel = gamesMatch
    ? `${gamesMatch[1].replace(/,/g, " ")} parties (leader) enregistrées côté source`
    : null;

  return { leaders, matrix, sourceLabel: SOURCE_LABEL, sourceUrl: SOURCE_URL, totalGamesLabel };
}

// Timeout volontairement sous la limite d'exécution des fonctions Vercel
// (10s sur le plan Hobby, non configurable). Sans ça, un site source lent
// ou bloquant fait planter toute la fonction AVANT que le try/catch de la
// route (/api/meta-matchups/refresh) ait pu répondre — Vercel renvoie alors
// sa propre page d'erreur HTML au lieu d'un JSON, ce qui casse res.json()
// côté client avec "Unexpected token '<'" (le bug remonté par l'utilisateur).
// Avec ce timeout, l'échec reste interne à fetchMetaMatchups() et remonte
// comme une erreur JSON normale, lisible dans l'UI.
const FETCH_TIMEOUT_MS = 8000;

export async function fetchMetaMatchups(): Promise<MetaMatchupData> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(SOURCE_URL, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      signal: controller.signal,
    });
  } catch (e: any) {
    if (e?.name === "AbortError") {
      throw new Error(`Le site source (${SOURCE_URL}) a mis trop de temps à répondre — réessaie plus tard.`);
    }
    throw new Error(`Impossible de joindre le site source (${SOURCE_URL}) : ${e?.message ?? String(e)}`);
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} en récupérant les données de méta (${SOURCE_URL}).`);
  }
  const html = await res.text();
  return parseWinMatrixHtml(html);
}
