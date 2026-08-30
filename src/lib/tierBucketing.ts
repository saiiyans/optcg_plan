export type TierLetter = "S" | "A" | "B" | "C" | "D";

/**
 * Répartit une liste déjà triée du "meilleur" au "pire" en 5 tiers (S à D)
 * par RANG (percentile) plutôt que par valeur brute. Volontairement générique
 * pour être utilisée avec deux échelles très différentes dans cette appli :
 * un nombre brut de decklists soumises (onepiecetopdecksTierScraper.ts) et
 * un taux de victoire pondéré, resserré entre ~45% et ~55%
 * (cardKaizokuTierScraper.ts). Baser le découpage sur le rang évite qu'une
 * échelle resserrée n'écrase tout le classement dans un seul tier.
 *
 * Seuils : S = 0–15% du classement, A = 15–35%, B = 35–65%, C = 65–85%,
 * D = 85–100%. Choix arbitraire mais documenté — à ajuster si le retour
 * utilisateur montre une répartition qui ne "sent" pas juste.
 */
export function tierByRankPercentile<T>(sortedDesc: T[]): Map<T, TierLetter> {
  const n = sortedDesc.length;
  const map = new Map<T, TierLetter>();
  sortedDesc.forEach((item, i) => {
    const pct = n <= 1 ? 0 : i / n;
    let tier: TierLetter;
    if (pct < 0.15) tier = "S";
    else if (pct < 0.35) tier = "A";
    else if (pct < 0.65) tier = "B";
    else if (pct < 0.85) tier = "C";
    else tier = "D";
    map.set(item, tier);
  });
  return map;
}
