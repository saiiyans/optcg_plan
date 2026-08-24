// --- Outil de fusion des leaders adverses (section 11) — logique pure,
// testable sans base de données (ne doit jamais importer "./db", même
// indirectement — voir la même remarque dans defeatAnalysis.ts). resolveOpponentLeaderId
// (voir leaderNormalization.ts) ne fusionne déjà QUE des variantes de
// casse/ponctuation strictement identiques une fois normalisées ; tout le
// reste crée une nouvelle fiche OpponentLeader. Ce module se contente de
// SUGGÉRER des paires probablement identiques parmi ces fiches distinctes,
// pour une revue manuelle — il ne fusionne jamais rien tout seul.

// Copie volontaire de la normalisation de leaderNormalization.ts : ce
// fichier-là importe "./db" (Prisma) au niveau module, ce qui empêcherait
// de tester cette logique pure indépendamment.
function normalizeLeaderKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/[.\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface LeaderSummary {
  id: string;
  displayName: string;
  rawNames: string[];
  matchCount: number;
}

export interface MergeSuggestion {
  a: LeaderSummary;
  b: LeaderSummary;
  reason: string;
}

// Retire un préfixe couleur isolé ("Purple ", "Red/Black ") pour comparer
// le nom "de base" sans le confondre avec une vraie différence de leader.
const COLOR_PREFIX_RE = /^(red|blue|purple|black|yellow|green)(\s*\/\s*(red|blue|purple|black|yellow|green))*\s+/i;

function baseName(raw: string): string {
  return normalizeLeaderKey(raw).replace(COLOR_PREFIX_RE, "").trim();
}

// Distance de Levenshtein simple — suffisante pour de courts noms de
// leader, jamais utilisée seule pour fusionner automatiquement.
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[] = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[n];
}

/**
 * Suggère des paires de fiches OpponentLeader probablement identiques —
 * base name identique après retrait du préfixe couleur, ou distance de
 * Levenshtein courte relative à la longueur du nom. Ne fusionne jamais
 * rien : sert uniquement à alimenter l'outil de revue manuelle.
 */
export function suggestLeaderMerges(leaders: LeaderSummary[]): MergeSuggestion[] {
  const suggestions: MergeSuggestion[] = [];
  for (let i = 0; i < leaders.length; i++) {
    for (let j = i + 1; j < leaders.length; j++) {
      const a = leaders[i];
      const b = leaders[j];
      const baseA = baseName(a.displayName);
      const baseB = baseName(b.displayName);
      if (!baseA || !baseB) continue;

      if (baseA === baseB) {
        suggestions.push({ a, b, reason: "Même nom une fois la couleur retirée du préfixe." });
        continue;
      }

      const maxLen = Math.max(baseA.length, baseB.length);
      if (maxLen < 4) continue; // noms trop courts, trop de faux positifs
      const dist = levenshtein(baseA, baseB);
      if (dist <= 2 && dist / maxLen <= 0.25) {
        suggestions.push({ a, b, reason: `Orthographe très proche (distance ${dist}).` });
        continue;
      }

      // Une variante contenue dans l'autre (ex. "Enel" / "Enel OP15-058"
      // déjà fusionnées par exact-match, mais "Enel" / "Enel Purple" ne
      // l'est pas si "Purple" n'est pas reconnu comme préfixe couleur).
      if (baseA.length >= 4 && baseB.length >= 4 && (baseA.includes(baseB) || baseB.includes(baseA))) {
        suggestions.push({ a, b, reason: "Un nom est inclus dans l'autre." });
      }
    }
  }
  return suggestions;
}
