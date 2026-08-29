import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { getLeader } from "@/lib/leaders";

// Le champ `date` de TournamentDeck est le texte brut récupéré sur
// onepiecetopdecks.com au format "M/J/AAAA" (mois d'abord, sans zéro
// initial — ex. "8/25/2026"), jamais normalisé en ISO. Un `orderBy: { date:
// "desc" }` Prisma sur une colonne texte trie ALPHABÉTIQUEMENT, pas
// chronologiquement : "8/25/2026" passe avant "8/4/2026" parce que '2' < '4'
// en comparaison de caractères — c'est exactement le classement mélangé
// observé sur /decks. On retrie donc ici en JS après coup, en reparsant
// chaque date en vrai timestamp, sans jamais faire planter la page sur une
// date mal formée (repli sur 0, la classant en dernier plutôt que de
// planter).
function parseUsDate(raw: string): number {
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : 0;
}

// La "région" d'un deck n'est pas stockée en base — jamais un champ à part
// à tenir synchronisé, juste dérivée du domaine dans sourceUrl à la
// lecture : onepiecetopdecks.com = decks Asie (Japon) ; limitlesstcg.com et
// optcg.gg = decks US/International (voir la note complète dans
// src/lib/limitlessScraper.ts et src/lib/optcggScraper.ts sur la portée
// géographique réelle de ces deux sources — aucune des deux ne fournit de
// pays par résultat, donc regroupées sous "international" plutôt que
// classées "Asie" par défaut).
function regionOf(sourceUrl: string): "asia" | "international" {
  return sourceUrl.includes("limitlesstcg.com") || sourceUrl.includes("optcg.gg") ? "international" : "asia";
}

// --- Importance de l'événement (demande du joueur : "classe les decks par
// l'importance de l'événement, ça aura plus de sens" — pas seulement par
// date). OPTCG ne publie aucun système de tiers officiel unique qui
// classerait FS/SB/3v3/Area Qualifiers/Regionals/Treasure Cups/Championships
// entre eux. Ce score est donc une ESTIMATION, construite uniquement à
// partir de deux signaux déjà réellement stockés en base (rien d'inventé) :
//   1. Des mots-clés connus dans tournamentType/host, classés du plus
//      structurant (Championship/LCQ) au plus local (Store Battle) ;
//   2. Le nombre de participants déclaré (participants), quand la source le
//      fournit — un tournoi à 100+ joueurs compte objectivement plus qu'un
//      à 8, quel que soit son nom.
// Documenté ici pour rester honnête : ce n'est PAS un classement officiel
// OPTCG, juste une heuristique lisible, chaque deck affiche son "tier"
// détecté (eventTier) pour que ce soit vérifiable, pas une boîte noire.
const EVENT_TIER_KEYWORDS: { pattern: RegExp; score: number; label: string }[] = [
  { pattern: /championship|lcq|last chance qualifier|\bworlds?\b/i, score: 100, label: "Championship" },
  { pattern: /regional/i, score: 90, label: "Regional" },
  { pattern: /area qualifier|special qualifier|\bqualifier/i, score: 80, label: "Qualifier" },
  { pattern: /ex ?grand/i, score: 70, label: "EX Grand" },
  { pattern: /treasure cup/i, score: 65, label: "Treasure Cup" },
  { pattern: /3v3/i, score: 45, label: "3v3" },
  { pattern: /\bsb\b|store battle/i, score: 35, label: "Store Battle" },
  { pattern: /\bfs\b|featured store/i, score: 30, label: "Featured Store" },
];

function estimateEventTier(tournamentType: string, host: string): { score: number; label: string } {
  const text = `${tournamentType ?? ""} ${host ?? ""}`;
  for (const t of EVENT_TIER_KEYWORDS) {
    if (t.pattern.test(text)) return { score: t.score, label: t.label };
  }
  return { score: 25, label: "Local / non classé" }; // type de tournoi non reconnu, plutôt qu'un plantage ou une supposition
}

function estimateEventImportance(d: { tournamentType: string; host: string; participants: number | null }): { importance: number; tierLabel: string } {
  const tier = estimateEventTier(d.tournamentType, d.host);
  // Bonus participants : jusqu'à +20 pour un événement à 100 joueurs déclarés et plus.
  const participantsBonus = d.participants ? Math.min(20, d.participants / 5) : 0;
  return { importance: tier.score + participantsBonus, tierLabel: tier.label };
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status"); // winner | top_performer | unverified
  const undefeatedOnly = sp.get("undefeated") === "true";
  const country = sp.get("country");
  const player = sp.get("player");
  const includesCard = sp.get("includesCard");
  const excludesCard = sp.get("excludesCard");
  const savedOnly = sp.get("saved") === "true";
  const source = sp.get("source"); // "asia" | "international" | null (= toutes)
  const leader = getLeader(sp.get("leader"));

  // Annotation explicite nécessaire dans cet environnement de dev (client
  // Prisma généré localement "vide" — voir la note dans deckComposition.ts).
  // Le vrai objet renvoyé par Prisma contient tous les champs du modèle ;
  // cette interface ne liste que ceux réellement lus dans ce fichier — le
  // `...d` plus bas propage quand même l'objet complet au JSON de réponse.
  type TournamentDeckRow = {
    id: string;
    leaderCardNumber: string;
    deckProfile: string;
    deckColor: string;
    deckName: string;
    format: string;
    player: string;
    country: string;
    date: string;
    placementRaw: string;
    wins: number | null;
    losses: number | null;
    undefeated: boolean;
    status: string;
    proofLevel: string | null;
    tournamentType: string;
    host: string;
    participants: number | null;
    sourceUrl: string;
    savedToMyDecks: boolean;
    cards: { cardNumber: string; quantity: number }[];
  };
  const decks: TournamentDeckRow[] = await db.tournamentDeck.findMany({
    where: {
      deckProfile: leader.deckProfile,
      ...(status ? { status } : {}),
      ...(undefeatedOnly ? { undefeated: true } : {}),
      ...(country ? { country: { contains: country, mode: "insensitive" } } : {}),
      ...(player ? { player: { contains: player, mode: "insensitive" } } : {}),
      ...(savedOnly ? { savedToMyDecks: true } : {}),
      ...(source === "asia" ? { sourceUrl: { contains: "onepiecetopdecks.com" } } : {}),
      ...(source === "international"
        ? { OR: [{ sourceUrl: { contains: "limitlesstcg.com" } }, { sourceUrl: { contains: "optcg.gg" } }] }
        : {}),
    },
    include: { cards: true },
    // Pré-tri par date d'import — sert uniquement de départage stable pour
    // les decks à date identique une fois retriés chronologiquement
    // ci-dessous (Array.sort est stable), pas le tri final affiché.
    // NB : TournamentDeck n'a PAS de champ `createdAt` (juste `importedAt` /
    // `updatedAt`, voir prisma/schema.prisma) — c'est le champ qu'il fallait
    // utiliser ici ; `createdAt` faisait échouer le build Vercel (Prisma
    // rejette un orderBy sur un champ qui n'existe pas dans le schéma).
    orderBy: { importedAt: "desc" },
  });

  let result = decks;
  if (includesCard) result = result.filter((d) => d.cards.some((c) => c.cardNumber === includesCard.toUpperCase()));
  if (excludesCard) result = result.filter((d) => !d.cards.some((c) => c.cardNumber === excludesCard.toUpperCase()));

  // Tri par importance de l'événement d'abord (voir estimateEventImportance
  // ci-dessus), la date ne sert plus que de départage entre deux decks
  // classés dans le même "tier" — remplace l'ancien tri purement
  // chronologique (parseUsDate seul), à la demande du joueur.
  const withImportance = result.map((d: (typeof result)[number]) => {
    const { importance, tierLabel } = estimateEventImportance(d);
    return { ...d, eventImportance: importance, eventTier: tierLabel };
  });
  withImportance.sort((a: (typeof withImportance)[number], b: (typeof withImportance)[number]) => {
    const diff = b.eventImportance - a.eventImportance;
    if (diff !== 0) return diff;
    return parseUsDate(b.date) - parseUsDate(a.date); // départage : le plus récent d'abord à importance égale
  });

  const withRegion = withImportance.map((d: (typeof withImportance)[number]) => ({ ...d, region: regionOf(d.sourceUrl) }));

  return NextResponse.json({ ok: true, count: withRegion.length, decks: withRegion });
}
