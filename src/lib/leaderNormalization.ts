import { db } from "./db";

/**
 * Normalisation légère pour comparer deux libellés de leader adverse sans
 * faux positifs : minuscules, retrait ponctuation/espaces/parenthèses de
 * couleur. Volontairement conservateur — ne fusionne automatiquement que
 * des variantes évidentes de casse/ponctuation ("Luffy Noir OP17" ==
 * "Luffy Noir (OP17)"), jamais deux leaders qui pourraient être différents.
 */
export function normalizeLeaderKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/[.\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Résout (ou crée) l'OpponentLeader canonique correspondant à un libellé
 * brut. Ne modifie jamais le texte brut d'un Match existant — sert
 * uniquement à renseigner opponentLeaderId pour permettre un regroupement
 * fiable dans les statistiques.
 */
export async function resolveOpponentLeaderId(rawLabel: string): Promise<string | null> {
  const trimmed = rawLabel.trim();
  if (!trimmed) return null;
  const key = normalizeLeaderKey(trimmed);

  const existing = await db.opponentLeader.findMany();
  for (const leader of existing) {
    const rawNames: string[] = JSON.parse(leader.rawNames || "[]");
    if (rawNames.some((n) => normalizeLeaderKey(n) === key)) {
      if (!rawNames.includes(trimmed)) {
        await db.opponentLeader.update({
          where: { id: leader.id },
          data: { rawNames: JSON.stringify([...rawNames, trimmed]) },
        });
      }
      return leader.id;
    }
  }

  const created = await db.opponentLeader.create({
    data: { displayName: trimmed, rawNames: JSON.stringify([trimmed]) },
  });
  return created.id;
}
