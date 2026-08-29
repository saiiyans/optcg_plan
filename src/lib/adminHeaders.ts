// Header à joindre aux appels fetch() côté navigateur vers les routes
// /api/admin/* protégées (voir src/lib/adminAuth.ts pour le détail de ce
// que ce secret protège vraiment et pourquoi). NEXT_PUBLIC_* est exposé
// dans le bundle JS envoyé au navigateur — ce n'est donc PAS un secret
// caché, juste une valeur qui doit correspondre à ADMIN_SECRET côté
// serveur pour que ces 3 boutons de l'app continuent de fonctionner une
// fois la protection ajoutée.
export const ADMIN_HEADERS: Record<string, string> = {
  "x-admin-secret": process.env.NEXT_PUBLIC_ADMIN_SECRET ?? "",
};
