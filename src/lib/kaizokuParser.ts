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
 * Format attendu (un bloc par partie, dans cet ordre, tel qu'affiché par la
 * page — les espaces/retours à la ligne exacts n'ont pas d'importance) :
 *
 *   07/08/2026
 *   11:25
 *   Dracule Mihawk [OP14-020]
 *   Rocks.D.Xebec [OP17-039] Won
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
  // interpréter entièrement (ex. résultat "Tied" non géré) — signalés à
  // l'utilisateur plutôt que silencieusement ignorés.
  warnings: string[];
}

const ENTRY_RE =
  /(\d{2})\/(\d{2})\/(\d{4})\s*\n\s*(\d{2}:\d{2})\s*\n\s*([^[\n]+?)\s*\[([A-Z0-9-]+)\]\s*\n+\s*([^[\n]+?)\s*\[([A-Z0-9-]+)\]\s*(Won|Lost|Tied)/g;

function resolveMyDeck(cardNumber: string): string {
  const setPrefix = cardNumber.match(/^([A-Z]+\d*)/)?.[1] ?? "";
  const leader = LEADERS.find((l) => l.leaderCardNumber.startsWith(setPrefix));
  return leader ? leader.label : cardNumber;
}

export function parseKaizokuText(raw: string): KaizokuParseResult {
  const matches: ParsedKaizokuMatch[] = [];
  const warnings: string[] = [];

  for (const m of raw.matchAll(ENTRY_RE)) {
    const [, dd, mm, yyyy, time, myLeaderName, myCard, opponentName, opponentCard, resultRaw] = m;

    if (resultRaw === "Tied") {
      warnings.push(`Match ${dd}/${mm}/${yyyy} ${time} contre ${opponentName.trim()} : résultat "Tied" (égalité) non géré, ignoré — ajoute-le manuellement si besoin.`);
      continue;
    }

    const date = `${yyyy}-${mm}-${dd}`;
    const opponentTrim = opponentName.trim();
    const kaizokuId = `kz_${date}_${time.replace(":", "")}_${opponentCard}_${resultRaw}`;

    matches.push({
      kaizokuId,
      date,
      time,
      myDeck: resolveMyDeck(myCard),
      myLeaderName: myLeaderName.trim(),
      myLeaderCardNumber: myCard,
      opponentLeader: `${opponentTrim} (${opponentCard})`,
      opponentName: opponentTrim,
      opponentCardNumber: opponentCard,
      result: resultRaw === "Won" ? "Victoire" : "Défaite",
    });
  }

  if (matches.length === 0 && warnings.length === 0) {
    warnings.push(
      "Aucune partie reconnue dans le texte collé. Copie bien le tableau complet depuis la page d'historique Kaizoku (colonnes Date / Leader / Opponent / Result)."
    );
  }

  return { matches, warnings };
}
