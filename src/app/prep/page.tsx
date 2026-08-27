import { redirect } from "next/navigation";

// Prépa ne contenait plus rien d'unique : le Journal (parties, coach),
// Matchups et Deck Profile avaient déjà tout récupéré — sa propre bannière
// le disait. Planning et Objectifs (son seul contenu restant) vivent
// maintenant directement dans le Journal, repliés par défaut. Redirection
// plutôt que suppression pure pour ne jamais casser un ancien lien/favori.
export default function PrepRedirect() {
  redirect("/journal");
}
