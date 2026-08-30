import { db } from "@/lib/db";
import { tierByRankPercentile, type TierLetter } from "@/lib/tierBucketing";

/**
 * Tier list "simulateur" — sourcée depuis Card D. Kaizoku (cardkaizoku.com),
 * l'outil de suivi de matchs déjà utilisé ailleurs dans l'appli (import de
 * matchs par copier-coller, lien vers la page Kaizoku personnelle — voir
 * kaizokuSync.ts). Leur page /ranking (https://www.cardkaizoku.com/ranking)
 * est une SPA qui charge ses données depuis un fichier JSON statique sur
 * leur CDN plutôt que depuis une API classique — repéré via l'onglet Réseau
 * du navigateur, jamais un endpoint caché/privé : c'est le même fichier que
 * charge n'importe quel visiteur de la page.
 *
 * DIFFÉRENT de la tier list "onepiecetopdecks.com" (opTopDecksTierScraper.ts,
 * basée sur un NOMBRE de decklists soumises) : ici le classement vient d'un
 * TAUX DE VICTOIRE pondéré calculé sur de vrais matchs enregistrés par les
 * utilisateurs de Card D. Kaizoku (jeu en ligne / simulateur), une mesure de
 * performance plutôt que de popularité — d'où le libellé "tier list du
 * simulateur" dans l'interface.
 *
 * Le nom du fichier JSON encode une date : stats_op{FORMAT}_lw_{YYYYMMDD}.json
 * ("lw" = fenêtre glissante "last week", mais un NOUVEAU fichier est publié
 * CHAQUE JOUR avec la date du jour — vérifié le 30/08/2026 via l'onglet
 * Réseau : stats_op17_lw_20260830.json ET stats_op17_lw_20260829.json
 * existaient tous les deux ce jour-là). Ne JAMAIS revenir à une logique
 * "vendredi le plus proche" ici — ancienne version de ce fichier qui
 * cherchait uniquement des vendredis et manquait donc systématiquement le
 * fichier du jour, laissant la tier list simulateur en erreur en
 * permanence. Comme la page est une SPA (le HTML brut ne contient aucune
 * donnée), on ne peut pas découvrir ce nom dynamiquement sans exécuter leur
 * JS : on part donc d'aujourd'hui (UTC) et on retente un jour en arrière
 * tant que le fichier du jour n'est pas encore publié.
 *
 * IMPORTANT — code de format à mettre à jour à la sortie d'un nouveau set,
 * même pratique que OPTOPDECKS_URL et DEFAULT_URL (tournament-decks/sync).
 */
const STATS_FORMAT_CODE = "op17";
const STATS_BASE = "https://cdn.cardkaizoku.com/stats";
const SOURCE_LABEL = "Card D. Kaizoku (cardkaizoku.com/ranking) — matchs réels enregistrés par les joueurs";
const SOURCE_PAGE_URL = "https://www.cardkaizoku.com/ranking";
const FETCH_TIMEOUT_MS = 8000; // même logique que metaMatchupScraper.ts — reste sous la limite Vercel (10s)
const MAX_DAYS_BACK = 10; // ~10 jours en arrière avant d'abandonner (fichier quotidien, pas hebdomadaire)
// Échantillon minimum pour éviter qu'un leader à 3 matchs joués fausse le
// classement avec un taux de victoire non représentatif.
const MIN_MATCHES_FOR_RANKING = 300;

interface RawKaizokuLeaderStat {
  leaderKey: string;
  leaderName: string;
  wins: number;
  number_of_matches: number;
  raw_win_rate: number;
  play_rate: number;
  weighted_win_rate: number;
}

export interface CardKaizokuTierEntry {
  cardNumber: string | null;
  displayName: string;
  color: string | null;
  weightedWinRatePct: number;
  matches: number;
  tier: TierLetter;
}

export interface CardKaizokuTierResult {
  entries: CardKaizokuTierEntry[];
  totalConsidered: number;
  statsFileDate: string; // YYYY-MM-DD du fichier réellement trouvé
  sourceUrl: string; // URL exacte du fichier JSON utilisé
  sourcePageUrl: string;
  sourceLabel: string;
  capturedAt: string;
}

function toYYYYMMDD(d: Date): string {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
}

async function fetchWithTimeout(url: string): Promise<Response | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res.ok ? res : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchLatestStatsFile(): Promise<{ data: RawKaizokuLeaderStat[]; fileDate: string; url: string }> {
  let candidate = new Date();
  for (let i = 0; i < MAX_DAYS_BACK; i++) {
    const dateStr = toYYYYMMDD(candidate);
    const url = `${STATS_BASE}/stats_${STATS_FORMAT_CODE}_lw_${dateStr}.json`;
    const res = await fetchWithTimeout(url);
    if (res) {
      const data = (await res.json()) as RawKaizokuLeaderStat[];
      return { data, fileDate: `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`, url };
    }
    candidate = new Date(candidate.getTime() - 24 * 60 * 60 * 1000);
  }
  throw new Error(
    `Impossible de trouver un fichier de classement récent sur ${STATS_BASE} (essayé ${MAX_DAYS_BACK} jours en arrière, format "${STATS_FORMAT_CODE}") — leur nommage de fichier a peut-être changé.`
  );
}

interface CardNameColorRow {
  cardNumber: string;
  name: string;
  color: string;
}

export async function fetchCardKaizokuTierList(): Promise<CardKaizokuTierResult> {
  const { data, fileDate, url } = await fetchLatestStatsFile();
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("Le fichier de classement récupéré est vide ou dans un format inattendu.");
  }

  const filtered = data.filter((e) => (e.number_of_matches ?? 0) >= MIN_MATCHES_FOR_RANKING);
  if (filtered.length === 0) {
    throw new Error(
      `Aucun leader n'atteint le seuil minimum de ${MIN_MATCHES_FOR_RANKING} matchs dans ce fichier — échantillon trop faible pour un classement fiable.`
    );
  }

  const sorted = [...filtered].sort((a, b) => (b.weighted_win_rate ?? 0) - (a.weighted_win_rate ?? 0));

  const knownNumbers = sorted.map((e) => e.leaderKey?.toUpperCase()).filter((n): n is string => !!n);
  const cardRows: CardNameColorRow[] =
    knownNumbers.length > 0
      ? await db.card.findMany({
          where: { cardNumber: { in: knownNumbers } },
          select: { cardNumber: true, name: true, color: true },
        })
      : [];
  const cardByNumber = new Map(cardRows.map((c) => [c.cardNumber, c]));

  const tierMap = tierByRankPercentile(sorted);

  const entries: CardKaizokuTierEntry[] = sorted.map((e) => {
    const cardNumber = e.leaderKey ? e.leaderKey.toUpperCase() : null;
    const known = cardNumber ? cardByNumber.get(cardNumber) : undefined;
    return {
      cardNumber,
      displayName: known?.name ?? e.leaderName ?? cardNumber ?? "Leader inconnu",
      color: known?.color ?? null,
      weightedWinRatePct: Math.round((e.weighted_win_rate ?? 0) * 1000) / 10,
      matches: e.number_of_matches ?? 0,
      tier: tierMap.get(e) ?? "D",
    };
  });

  return {
    entries,
    totalConsidered: entries.length,
    statsFileDate: fileDate,
    sourceUrl: url,
    sourcePageUrl: SOURCE_PAGE_URL,
    sourceLabel: SOURCE_LABEL,
    capturedAt: new Date().toISOString(),
  };
}
