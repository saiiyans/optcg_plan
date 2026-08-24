// --- Petit bus d'événements côté client (section 3) ---
//
// Le layout racine ne se remonte pas lors d'une navigation interne Next.js
// (App Router) : sans ce bus, le widget d'en-tête ne saurait pas qu'une
// nouvelle partie vient d'être enregistrée ailleurs dans l'app (Journal,
// Prépa) tant qu'il n'a pas fait son prochain sondage périodique. On
// notifie donc explicitement juste après un enregistrement réussi.

type Listener = () => void;
const listeners = new Set<Listener>();

export function onMatchLogged(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyMatchLogged(): void {
  listeners.forEach((l) => {
    try {
      l();
    } catch (e) {
      console.error("trainingCounterBus listener failed:", e);
    }
  });
}
