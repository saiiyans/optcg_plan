/**
 * Script one-shot : insère directement les decks Mihawk (op14mihawk) connus
 * dans la base de données, sans passer par le scraping en direct du site.
 *
 * Usage :
 *   node scripts/seed-mihawk-decks.js
 *
 * Nécessite un fichier .env à la racine avec DATABASE_URL pointant vers ta
 * base Neon (le même que pour `npm run db:push`).
 *
 * N'invente aucune carte : chaque decklist brute vient d'un lien fourni par
 * l'utilisateur. Si le parseur détecte autre chose que 50 cartes hors
 * Leader, la ligne est quand même insérée mais marquée "needs_review" —
 * jamais corrigée silencieusement.
 */

// Charge .env sans dépendance externe (juste DATABASE_URL nous intéresse ici).
const fs = require("fs");
const path = require("path");
try {
  const envPath = path.join(__dirname, "..", ".env");
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
} catch (e) {
  console.warn("Impossible de lire .env — assure-toi que DATABASE_URL est déjà défini dans l'environnement.");
}

const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

const SOURCE_URL = "https://onepiecetopdecks.com/deck-list/japan-op16-deck-list-the-time-of-battle/";
const LEADER = "OP14-020";

// --- Les 20 decks connus (voir le message associé pour la liste complète des sources) ---
const ROWS = [
  { dn: "G Mihawk", date: "8/4/2026", cn: "JP", au: "Shishi", pl: "1st (5-0)", tn: "FS", hs: "Cardshop",
    dg: "1nOP14-020a4nOP07-022a4nOP12-034a4nOP14-023a4nST32-001a2nST32-005a4nOP10-030a3nOP14-029a4nST32-002a1nOP13-031a4nST32-003a2nOP14-119a3nST24-004a4nOP01-055a2nOP06-038a3nOP12-037a1nOP13-040a1nOP14-039" },
  { dn: "G Mihawk", date: "8/4/2026", cn: "PH", au: "Del", pl: "1st (4-0)", tn: "FS", hs: "Courtside Galleria",
    dg: "1nOP14-020a4nOP12-034a4nOP15-035a4nST32-001a4nST32-005a2nPRB02-006a1nOP07-026a2nOP10-030a3nOP14-033a4nST32-002a2nOP13-031a4nST32-003a4nST24-004a4nOP01-055a3nOP12-037a3nOP13-040a2nOP08-036" },
  { dn: "G Mihawk", date: "8/2/2026", cn: "JP", au: "Kana", pl: "1st (8-1)", tn: "3v3", hs: "TatejimaCup",
    dg: "1nOP14-020a4nEB01-015a4nOP12-034a2nST32-001a4nST32-005a2nST24-002a1nOP10-030a2nOP12-118a3nOP12-031a2nOP14-033a4nST32-002a4nOP13-031a2nST32-003a2nOP14-119a3nST24-004a2nOP01-055a3nOP12-037a1nOP12-038a4nOP13-040a1nOP14-039" },
  { dn: "G Mihawk", date: "8/2/2026", cn: "JP", au: "Itocco", pl: "1st (5-0)", tn: "EXGrand", hs: "Preyz",
    dg: "1nOP14-020a4nOP12-034a4nOP15-035a4nST32-001a4nST32-005a2nOP10-030a3nOP14-033a4nST32-002a4nOP13-031a2nST32-003a1nST16-004a2nOP14-119a3nST24-004a2nOP01-055a2nOP01-057a1nOP12-037a4nOP13-040a2nOP14-039a2nOP04-035" },
  { dn: "G Mihawk", date: "8/2/2026", cn: "JP", au: "Ariyuki", pl: "1st Place", tn: "FS", hs: "Cardshop",
    dg: "1nOP14-020a4nOP07-022a4nOP12-034a4nOP14-023a2nOP15-035a4nST32-001a2nST32-005a4nOP10-030a2nOP14-033a4nST32-002a4nST32-003a1nOP14-027a4nST24-004a4nOP01-055a2nOP12-037a4nOP13-040a1nOP14-039" },
  { dn: "G Mihawk", date: "7/25/2026", cn: "JP", au: "Potaka", pl: "1st Place", tn: "SB", hs: "CK_mizonokuchi",
    dg: "1nOP14-020a4nOP12-034a4nOP15-035a4nST32-001a4nST32-005a2nOP07-026a4nOP14-033a4nST32-002a4nOP13-031a4nST32-003a1nST16-004a2nOP14-119a3nST24-004a2nOP06-038a3nOP12-037a3nOP13-040a2nOP14-039" },
  { dn: "G Mihawk", date: "7/22/2026", cn: "JP", au: "Mitsu", pl: "1st (4-0)", tn: "EXGrand", hs: "Cardshop",
    dg: "1nOP14-020a4nOP12-034a3nOP14-023a4nST32-001a4nST32-005a3nOP10-030a4nOP14-033a4nST32-002a3nOP13-031a3nST32-003a1nST16-004a2nOP14-119a3nST24-004a2nOP01-055a2nOP01-057a1nOP06-038a3nOP12-037a3nOP13-040a1nOP14-037" },
  { dn: "G Mihawk", date: "7/20/2026", cn: "JP", au: "GingaJkymm", pl: "T16 (9-2)", tn: "Area Qualifiers", hs: "Bandai(1228)",
    dg: "1nOP14-020a4nOP07-022a4nOP12-034a4nOP14-023a4nST32-001a4nST32-005a3nOP10-030a3nOP14-033a4nST32-002a4nST32-003a2nOP14-119a4nST24-004a4nOP01-055a3nOP12-037a3nOP13-040" },
  { dn: "G Mihawk", date: "7/19/2026", cn: "JP", au: "Bal", pl: "1st (5-0)", tn: "FS", hs: "Cardshop",
    dg: "1nOP14-020a4nOP07-022a4nOP12-034a4nOP14-023a4nST32-001a3nST32-005a1nOP10-030a4nOP14-033a4nST32-002a2nOP13-031a4nST32-003a1nST16-004a2nOP14-119a3nST24-004a4nOP01-055a2nOP06-038a3nOP12-037a1nOP14-039" },
  { dn: "G Mihawk", date: "7/18/2026", cn: "JP", au: "Taiki", pl: "1st Place", tn: "Area Qualifiers", hs: "Bandai(467)",
    dg: "1nOP14-020a4nOP07-022a4nOP12-034a4nOP14-023a4nST32-001a4nST32-005a3nOP07-026a3nOP14-033a4nST32-002a2nOP13-031a4nST32-003a4nST24-004a4nOP01-055a3nOP12-037a3nOP13-040" },
  { dn: "G Mihawk", date: "7/18/2026", cn: "JP", au: "Tasu", pl: "2nd Place", tn: "Area Qualifiers", hs: "Bandai(467)",
    dg: "1nOP14-020a4nOP07-022a4nOP12-034a4nOP14-023a4nST32-001a3nST32-005a1nOP14-026a4nOP10-030a1nOP12-031a4nST32-002a1nOP13-031a4nST32-003a4nST24-004a4nOP01-055a4nOP12-037a4nOP08-036" },
  { dn: "G Mihawk", date: "7/18/2026", cn: "JP", au: "329kon", pl: "1st (5-0)", tn: "FS EX", hs: "Bandai(Hiroshima)",
    dg: "1nOP14-020a4nST02-007a1nEB01-015a4nOP12-034a3nOP15-035a4nST32-005a4nOP10-030a2nOP12-118a4nST32-002a4nOP13-031a3nST32-003a2nST16-004a2nOP14-119a3nST24-004a4nOP12-037a4nOP13-040a1nOP14-039a1nOP08-036" },
  { dn: "G Mihawk", date: "7/16/2026", cn: "JP", au: "Potaka", pl: "1st (4-0)", tn: "ShopEvent", hs: "PotakaCup",
    dg: "1nOP14-020a4nOP12-034a4nOP15-035a4nST32-001a4nST32-005a1nOP10-030a2nOP12-118a2nOP14-033a4nST32-002a4nOP13-031a4nST32-003a2nOP14-119a3nST24-004a1nOP06-038a2nOP12-037a1nOP12-038a4nOP13-040a2nOP14-039a2nOP08-036" },
  { dn: "G Mihawk", date: "7/14/2026", cn: "JP", au: "Hori", pl: "1st Place", tn: "SB", hs: "Overseas",
    dg: "1nOP14-020a4nOP07-022a4nOP12-034a4nOP14-023a4nST32-001a4nEB01-013a2nOP10-030a4nOP14-033a4nST32-002a3nOP13-031a3nST32-003a2nOP14-119a3nST24-004a4nOP01-055a3nOP06-038a2nOP12-037" },
  { dn: "G Mihawk", date: "7/12/2026", cn: "JP", au: "SHO", pl: "T4 (6-2)", tn: "ShopEvent", hs: "UnigunCS",
    dg: "1nOP14-020a4nEB01-015a4nOP12-034a4nST32-001a4nST32-005a2nST24-002a2nPRB02-006a2nOP07-026a2nOP10-030a1nOP12-118a2nOP14-033a4nST32-002a4nOP13-031a3nST32-003a3nOP14-119a3nST24-004a2nOP12-037a4nOP13-040" },
  { dn: "G Mihawk", date: "7/12/2026", cn: "JP", au: "Yuzuha", pl: "1st (6-0)", tn: "2SB", hs: "Cardshop",
    dg: "1nOP14-020a4nOP07-022a4nOP12-034a4nOP14-023a4nST32-001a2nOP12-118a4nOP14-033a4nST32-002a3nOP13-031a4nST32-003a3nOP14-119a3nST24-004a4nOP01-055a2nOP12-037a3nOP13-040a2nOP14-039" },
  { dn: "G Mihawk", date: "7/11/2026", cn: "JP", au: "Riku", pl: "1st Place", tn: "ShopEvent", hs: "Yamamori Cup",
    dg: "1nOP14-020a4nOP07-022a4nOP12-034a4nOP14-023a4nST32-001a4nEB01-013a2nOP10-030a4nOP14-033a4nST32-002a3nOP13-031a3nST32-003a2nOP14-119a3nST24-004a4nOP01-055a3nOP06-038a2nOP12-037" },
  // Akki (7/1/2026, JP, 1st Place, FS, Girafull(59)) volontairement absent :
  // le lien complet avec la decklist (dg=...) n'a pas été fourni. Ne pas
  // inventer — ajouter une ligne ici si le lien est retrouvé.
  { dn: "G Mihawk", date: "6/28/2026", cn: "PH", au: "tamtonjc", pl: "2nd (7-1)", tn: "1v1 GAO", hs: "GAOFinal",
    dg: "1nOP14-020a2nST02-007a4nEB01-015a4nOP12-034a4nOP15-035a4nST24-002a3nOP07-026a3nOP12-118a2nOP12-031a3nOP14-033a3nOP13-031a2nST16-004a2nOP14-119a3nOP13-028a2nOP06-038a1nOP12-037a1nOP12-038a4nOP13-040a1nOP14-039a2nOP08-036" },
  { dn: "G Mihawk", date: "6/14/2026", cn: "JP", au: "SHIN", pl: "1st (5-0)", tn: "FS", hs: "Cardshop",
    dg: "1nOP14-020a2nST02-007a4nEB01-015a4nOP12-034a3nOP15-035a4nST24-002a3nOP07-026a3nOP10-030a4nOP12-118a2nOP14-033a4nOP13-031a3nOP14-119a4nST24-004a2nOP06-038a2nOP12-037a3nOP13-040a3nOP08-036" },
  { dn: "G Mihawk", date: "6/10/2026", cn: "JP", au: "Furedo", pl: "1st (5-0)", tn: "EXGrand", hs: "Cardshop",
    dg: "1nOP14-020a2nST02-007a3nEB01-015a4nOP12-034a4nOP15-035a4nST24-002a4nOP07-026a3nOP10-030a3nOP12-118a2nOP14-033a4nOP13-031a3nOP14-119a3nST24-004a2nOP06-038a2nOP12-037a3nOP13-040a2nOP14-039a2nOP08-036" },
];

// --- Parseur (copie fidèle de src/lib/deckParser.ts, en JS simple) ---
function parseCompactDecklist(raw) {
  const errors = [];
  const tokens = raw.split("a").filter(Boolean);
  const entries = [];
  for (const token of tokens) {
    const m = token.match(/^(\d+)n([A-Z0-9-]+)$/i);
    if (!m) { errors.push(`Token illisible : "${token}"`); continue; }
    entries.push({ quantity: parseInt(m[1], 10), cardNumber: m[2].toUpperCase() });
  }
  const leader = entries[0] ?? null;
  const cards = entries.slice(1);
  const totalNonLeader = cards.reduce((s, c) => s + c.quantity, 0);
  if (!leader) errors.push("Aucun Leader détecté");
  if (leader && leader.quantity !== 1) errors.push(`Leader qty=${leader.quantity}`);
  if (totalNonLeader !== 50) errors.push(`Total=${totalNonLeader} au lieu de 50`);
  for (const c of cards) if (c.quantity > 4) errors.push(`${c.cardNumber} a ${c.quantity} exemplaires`);
  return { leader, cards, totalNonLeader, valid: errors.length === 0, errors };
}

function classifyPlacement(placementRaw) {
  const recordMatch = placementRaw.match(/\((\d+)-(\d+)\)/);
  const wins = recordMatch ? parseInt(recordMatch[1], 10) : null;
  const losses = recordMatch ? parseInt(recordMatch[2], 10) : null;
  const undefeated = losses !== null && losses === 0 && (wins ?? 0) > 0;
  const isFirst = /^1st\b/i.test(placementRaw.trim());
  const isTopCut = /^(top\s?\d+|t\d+|2nd|3rd|4th)\b/i.test(placementRaw.trim());
  let status = "unverified";
  let proofLevel = null;
  if (isFirst) { status = "winner"; proofLevel = "gold"; }
  else if (isTopCut) {
    status = "top_performer";
    const topNum = placementRaw.match(/(?:top\s?|t)(\d+)/i);
    proofLevel = topNum && parseInt(topNum[1], 10) <= 8 ? "silver" : "bronze";
  } else if (wins !== null) {
    proofLevel = wins > (losses ?? 0) ? "bronze" : null;
  }
  return { wins, losses, undefeated, status, proofLevel };
}

function extractParticipants(host) {
  const m = host.match(/\((\d+)\)/);
  return m ? parseInt(m[1], 10) : null;
}

function buildUniqueKey({ leaderCardNumber, player, date, tournamentType, host, placementRaw }) {
  return [leaderCardNumber, player, date, tournamentType, host, placementRaw].join("|").toLowerCase();
}

async function main() {
  let created = 0, updated = 0, needsReview = 0, skipped = 0;

  for (const row of ROWS) {
    const parsed = parseCompactDecklist(row.dg);
    const placement = classifyPlacement(row.pl);
    const uniqueKey = buildUniqueKey({
      leaderCardNumber: LEADER, player: row.au, date: row.date,
      tournamentType: row.tn, host: row.hs, placementRaw: row.pl,
    });

    const validationStatus = parsed.valid ? "valid" : "needs_review";
    if (!parsed.valid) {
      needsReview++;
      console.warn(`⚠ ${row.au} (${row.date}) : ${parsed.errors.join("; ")}`);
    }

    const existing = await db.tournamentDeck.findUnique({ where: { uniqueKey } });
    if (existing) { skipped++; console.log(`— déjà en base : ${row.au} (${row.date})`); continue; }

    await db.tournamentDeck.create({
      data: {
        uniqueKey,
        leaderCardNumber: LEADER,
        deckProfile: "op14mihawk",
        deckColor: "Green",
        deckName: row.dn,
        player: row.au,
        country: row.cn,
        date: row.date,
        placementRaw: row.pl,
        wins: placement.wins,
        losses: placement.losses,
        undefeated: placement.undefeated,
        status: placement.status,
        proofLevel: placement.proofLevel,
        tournamentType: row.tn,
        host: row.hs,
        participants: extractParticipants(row.hs),
        cardCountNonLeader: parsed.totalNonLeader,
        validationStatus,
        rawDecklist: row.dg,
        sourceUrl: SOURCE_URL,
        cards: { create: parsed.cards.map((c) => ({ cardNumber: c.cardNumber, quantity: c.quantity })) },
      },
    });
    created++;
    console.log(`✓ ${row.au} (${row.date}) — ${row.pl} — ${parsed.totalNonLeader} cartes — ${placement.status}`);
  }

  console.log(`\nTerminé : ${created} créés, ${skipped} déjà en base, ${needsReview} à vérifier (50 cartes non atteintes).`);
  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
