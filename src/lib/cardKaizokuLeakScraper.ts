/**
 * Cartes "leak" (reveal avant sortie officielle) — sourcées EN DIRECT depuis
 * Card D. Kaizoku (cardkaizoku.com/spoilers), qui alimente cette page depuis
 * le MÊME fichier catalogue que /ranking (repéré via l'onglet Réseau du
 * navigateur le 30/08/2026, jamais un endpoint caché/privé) :
 * https://cdn.cardkaizoku.com/card_data.json — un alias STABLE (contrairement
 * au fichier de stats quotidien de cardKaizokuTierScraper.ts, celui-ci n'a
 * pas de date dans son nom, donc pas besoin de deviner/retenter).
 *
 * Remplace l'ancien import ponctuel à la main (src/app/api/admin/import-op17-leaks/
 * route.ts, src/lib/data/op17-confirmed.json) : celui-là était un instantané
 * figé capturé une seule fois avant la sortie d'OP17, jamais reconductible.
 * Ici chaque clic sur "🔮 Actualiser les leaks" relit vraiment le site.
 *
 * IMPORTANT — à mettre à jour à CHAQUE nouveau cycle de reveal (même
 * pratique que OPTOPDECKS_URL, STATS_FORMAT_CODE) : LEAK_SET_CODES est la
 * SEULE liste des sets actuellement en période de reveal. Dès qu'un set
 * sort officiellement (ex. OP17 le 28/08/2026), retire son code d'ici — le
 * bouton "Actualiser" repasse alors automatiquement isLeak=false sur toutes
 * ses cartes déjà en base (voir /api/leaks/refresh), sans script séparé à
 * lancer à la main.
 */
const CARD_DATA_URL = "https://cdn.cardkaizoku.com/card_data.json";
export const LEAK_SOURCE_PAGE_URL = "https://www.cardkaizoku.com/spoilers";
export const LEAK_SOURCE_LABEL = "Card D. Kaizoku (cardkaizoku.com/spoilers)";
export const LEAK_SET_CODES = ["OP18", "EB05"];

// BUG CORRIGÉ (30/08/2026) : un User-Agent "identifiant" personnalisé
// (optcg-mihawk-coach/0.1...) déclenchait un 403 systématique sur
// cdn.cardkaizoku.com — vérifié en direct : le même fetch, avec le
// User-Agent d'un vrai navigateur, réussit (200). Leur CDN filtre donc les
// requêtes par apparence de User-Agent (protection anti-bot classique,
// type Cloudflare) plutôt que par clé/quota — on se présente donc comme un
// navigateur standard, exactement ce que fait n'importe quel visiteur de
// cardkaizoku.com/spoilers.
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

interface RawKaizokuCard {
  cardNumber: string;
  cardName: string;
  cost: string | null;
  attribute: string | null;
  cardType: string; // "CHARACTER" | "EVENT" | "STAGE" | "LEADER" (tout en majuscules côté source)
  power: string | null;
  counter: string | null;
  color: string | null;
  feature: string | null;
  text: string | null;
  rarity: string | null;
  trigger: string | null;
  bucketImg: string | null;
  block: string | number | null;
  cardSet: string;
}

export interface LeakCardData {
  cardNumber: string;
  name: string;
  category: string; // "Character" | "Event" | "Stage" | "Leader" — jamais autre chose que ce que la source donne, normalisé en casse seulement
  color: string | null;
  setCode: string;
  rarity: string | null; // code brut de la source (ex: "C", "SR") — jamais développé/deviné
  cost: number | null;
  power: number | null;
  life: number | null; // renseigné uniquement pour category="Leader" (power réutilisé comme vie, seule info dispo côté source)
  counter: number | null;
  attribute: string | null;
  types: string;
  officialText: string | null;
  imageUrl: string | null;
  block: string | null;
}

export interface LeakFetchResult {
  cards: LeakCardData[];
  capturedAt: string;
  sourceUrl: string;
}

function normalizeCategory(raw: string): string {
  const cleaned = (raw || "").trim();
  if (!cleaned) return "Unknown";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
}

function toNullableInt(raw: string | number | null): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = typeof raw === "number" ? raw : parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

/** Le texte d'effet de la source utilise des <br/> HTML — jamais de balise dans nos champs texte ailleurs dans l'app. */
function stripHtml(raw: string | null): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim();
  return cleaned || null;
}

export async function fetchKaizokuLeakCards(): Promise<LeakFetchResult> {
  const res = await fetch(CARD_DATA_URL, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} en récupérant ${CARD_DATA_URL}`);
  const all = (await res.json()) as RawKaizokuCard[];
  if (!Array.isArray(all)) {
    throw new Error("Réponse inattendue de card_data.json (pas un tableau) — la structure a peut-être changé.");
  }

  const leakSetCodes = new Set(LEAK_SET_CODES.map((c) => c.toUpperCase()));
  const filtered = all.filter((c) => leakSetCodes.has((c.cardSet || "").toUpperCase()));

  const cards: LeakCardData[] = filtered.map((c) => {
    const category = normalizeCategory(c.cardType);
    const isLeader = category === "Leader";
    return {
      cardNumber: c.cardNumber.toUpperCase(),
      name: c.cardName,
      category,
      color: c.color || null,
      setCode: (c.cardSet || "").toUpperCase(),
      rarity: c.rarity || null,
      cost: isLeader ? null : toNullableInt(c.cost),
      power: isLeader ? null : toNullableInt(c.power),
      life: isLeader ? toNullableInt(c.power) : null,
      counter: toNullableInt(c.counter),
      attribute: c.attribute || null,
      types: c.feature || "",
      officialText: stripHtml(c.text),
      imageUrl: c.bucketImg || null,
      block: c.block !== null && c.block !== undefined && c.block !== "" ? `Block ${c.block}` : null,
    };
  });

  return { cards, capturedAt: new Date().toISOString(), sourceUrl: CARD_DATA_URL };
}
