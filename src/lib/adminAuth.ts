import { NextRequest, NextResponse } from "next/server";

/**
 * Garde-fou pour les routes d'administration (/api/admin/*) et pour les
 * routes d'import/synchronisation qui écrivent en base ou appellent des
 * API externes payantes (Gemini...). Avant ce correctif (audit du
 * 29/08/2026), ces routes étaient accessibles à QUICONQUE trouvait l'URL,
 * sans aucune protection — n'importe qui aurait pu déclencher un import,
 * épuiser le quota Gemini, ou modifier des données.
 *
 * IMPORTANT — ce que c'est, et ce que ce n'est PAS : ce n'est pas un vrai
 * système d'authentification (pas de compte, pas de session, pas de mot de
 * passe utilisateur) — juste un secret partagé, exactement comme
 * /api/cron/sync-kaizoku le fait déjà avec CRON_SECRET. Pour une appli
 * mono-utilisateur (toi seul, ton propre compte Vercel), c'est le bon
 * compromis : ça bloque les scanners/bots automatiques qui tentent des
 * URLs d'admin connues à l'aveugle — la vraie menace ici — sans construire
 * un système de comptes que personne d'autre n'utilisera jamais.
 *
 * Variable d'environnement requise sur Vercel : ADMIN_SECRET (une valeur
 * aléatoire, ex. générée avec `openssl rand -hex 32`). Sans elle définie,
 * TOUTES ces routes refusent TOUT LE MONDE — échec fermé par défaut,
 * jamais ouvert — donc à définir avant de compter dessus. Voir DEPLOY.md.
 */
export function requireAdminSecret(req: NextRequest): NextResponse | null {
  const secret = process.env.ADMIN_SECRET;
  const auth = req.headers.get("authorization");
  const provided = req.headers.get("x-admin-secret") ?? (auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null);
  if (!secret || !provided || provided !== secret) {
    return NextResponse.json(
      { ok: false, error: "Non autorisé. Vérifie que ADMIN_SECRET (et NEXT_PUBLIC_ADMIN_SECRET pour les boutons de l'app) est bien défini sur Vercel." },
      { status: 401 }
    );
  }
  return null;
}

/**
 * Liste blanche des domaines externes que les routes de synchronisation
 * (Winning Decks) ont le droit d'aller récupérer côté serveur. Avant ce
 * correctif, ces routes acceptaient une URL arbitraire dans le corps de la
 * requête et la fetchaient sans vérification (SSRF potentiel) — même sans
 * secret admin, cette liste reste une seconde barrière indépendante.
 */
export const ALLOWED_SYNC_HOSTS = [
  "onepiecetopdecks.com",
  "onepiece.limitlesstcg.com",
  "www.optcg.gg",
  "optcg.gg",
];

export function isAllowedSyncUrl(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== "https:") return false;
    return ALLOWED_SYNC_HOSTS.some((host) => u.hostname === host || u.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}
