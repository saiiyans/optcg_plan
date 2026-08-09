/**
 * Parseur souple pour du texte collé depuis le presse-papier : accepte le
 * format compact "1nOP14-020a4nOP07-022a..." (copié depuis un lien
 * onepiecetopdecks.com) aussi bien que des lignes libres du type
 * "4x OP07-022", "4 OP07-022" ou "OP07-022 x4".
 *
 * N'invente jamais une quantité : chaque paire {quantité, numéro} vient
 * directement du texte collé, jamais déduite. Partagé entre la création
 * et la mise à jour de deck personnel pour ne jamais dupliquer la logique.
 */
export function parseDeckClipboardText(raw: string): { cardNumber: string; quantity: number }[] {
  const found: { cardNumber: string; quantity: number }[] = [];
  const regex = /(\d+)\s*n?x?\s*([A-Z]{2,4}\d{1,2}-\d{3})/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(raw)) !== null) {
    found.push({ quantity: parseInt(m[1], 10), cardNumber: m[2].toUpperCase() });
  }
  return found;
}
