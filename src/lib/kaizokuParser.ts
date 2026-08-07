import { LEADERS } from "./leaders";

/**
 * Parse le texte brut copié depuis une page d'historique de matchs
 * Card D. Kaizoku (cardkaizoku.com/matchhistory/search) en une liste de
 * parties structurées, prêtes à être comparées/insérées dans la table Match.
 *
 * Pourquoi un copier-coller plutôt qu'un scraper automatique : la page est
 * une application React sans rendu serveur des données (le HTML brut ne
 * contient que "You need to enable JavaScript to run this app.") et sans
 * appel réseau exploitable observable depuis l'extérieur — probablement une
 * lecture Firestore directe côté client. Un scraper HTTP classique ne peut
 * donc pas la lire de façon fiable. Le texte affiché à l'écran, lui, est
 * stable et facile à copier depuis n'importe quel navigateur ou téléphone.
 *
 * Approche par blocs plutôt qu'un unique gros regex séquentiel : chaque
 * bloc commence à une ligne "date\nheure" et s'étend jusqu'au bloc suivant
 * (ou la fin du texte). À l'intérieur d'un bloc, on ne cherche que deux
 * choses — toutes les paires "Nom [NUMERO]" présentes, et le mot
 * Won/Lost/Tied — sans présumer de ce qu'il peut y avoir entre les deux
 * (tabulations, colonnes de numéro de carte dupliquées, espaces
 * variables...). Le premier couple nom/numéro rencontré est toujours MON
 * leader (il apparaît juste après l'heure), le dernier est toujours celui
 * de l'adversaire (il précède directement Won/Lost) — peu importe combien
 * de tokens intermédiaires la page ajoute selon la mise en page copiée.
 */

export interface ParsedKaizokuMatch {
  kaizokuId: string;
  date: string; // ISO yyyy-mm-dd
  time: string; // HH:MM, à titre indicatif seulement (pas stocké en base)
  myDeck: string; // résolu via leaders.ts à partir du numéro de carte du leader joué
  myLeaderName: string;
  myLeaderCardNumber: string;
  opponentLeader: string; // "Nom (NUMERO)"
  opponentName: string;
  opponentCardNumber: string;
  result: "Victoire" | "Défaite";
}

export interface KaizokuParseResult {
  matches: ParsedKaizokuMatch[];
  // Blocs reconnus comme "une tentative de partie" mais qu'on n'a pas pu
  // interpréter entièrement (ex. résultat "Tied", ou une seule paire
  // nom/numéro trouvée) — signalés à l'utilisateur plutôt que
  // silencieusement ignorés.
  warnings: string[];
}

const DATE_TIME_RE = /(\d{2})\/(\d{2})\/(\d{4})\s*\n\s*(\d{2}:\d{2})/;
const BLOCK_RE = new RegExp(
  DATE_TIME_RE.source + "\\s*\\n([\\s\\S]*?)(?=\\d{2}/\\d{2}/\\d{4}\\s*\\n\\s*\\d{2}:\\d{2}|$)",
  "g"
);
// Une paire "Nom [NUMERO]" — le nom peut contenir espaces, points, tirets
// (ex. "Rocks.D.Xebec"), tout sauf un crochet ou une tabulation/retour ligne.
const PAIR_RE = /([^[\]\n\t]+?)\s*\[([A-Z0-9-]+)\]/g;
const RESULT_RE = /\b(Won|Lost|Tied)\b/;

function resolveMyDeck(cardNumber: string): string {
  const setPrefix = cardNumber.match(/^([A-Z]+\d*)/)?.[1] ?? "";
  const leader = LEADERS.find((l) => l.leaderCardNumber.startsWith(setPrefix));
  return leader ? leader.label : cardNumber;
}

export function parseKaizokuText(raw: string): KaizokuParseResult {
  const matches: ParsedKaizokuMatch[] = [];
  const warnings: string[] = [];
  let blockCount = 0;

  for (const m of raw.matchAll(BLOCK_RE)) {
    blockCount++;
    const [, dd, mm, yyyy, time, blockBody] = m;
    const dateLabel = `${dd}/${mm}/${yyyy} ${time}`;

    const pairs = [...blockBody.matchAll(PAIR_RE)];
    const resultMatch = blockBody.match(RESULT_RE);

    if (pairs.length < 2) {
      warnings.push(`Bloc ${dateLabel} : impossible d'y trouver deux leaders (mon deck + adversaire), ignoré.`);
      continue;
    }
    if (!resultMatch) {
      warnings.push(`Bloc ${dateLabel} : aucun résultat "Won"/"Lost" trouvé, ignoré.`);
      continue;
    }
    if (resultMatch[1] === "Tied") {
      warnings.push(`Bloc ${dateLabel} : résultat "Tied" (égalité) non géré, ignoré — ajoute-le manuellement si besoin.`);
      continue;
    }

    const myPair = pairs[0];
    const oppPair = pairs[pairs.length - 1];
    const myLeaderName = myPair[1].trim();
    const myCard = myPair[2];
    const opponentName = oppPair[1].trim();
    const opponentCard = oppPair[2];
    const resultRaw = resultMatch[1];

    const date = `${yyyy}-${mm}-${dd}`;
    const kaizokuId = `kz_${date}_${time.replace(":", "")}_${opponentCard}_${resultRaw}`;

    matches.push({
      kaizokuId,
      date,
      time,
      myDeck: resolveMyDeck(myCard),
      myLeaderName,
      myLeaderCardNumber: myCard,
      opponentLeader: `${opponentName} (${opponentCard})`,
      opponentName,
      opponentCardNumber: opponentCard,
      result: resultRaw === "Won" ? "Victoire" : "Défaite",
    });
  }

  if (blockCount === 0) {
    warnings.push(
      "Aucune partie reconnue dans le texte collé. Copie bien le tableau complet depuis la page d'historique Kaizoku (colonnes Date / Leader / Opponent / Result)."
    );
  }

  return { matches, warnings };
}
