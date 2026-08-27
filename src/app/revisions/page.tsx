import { redirect } from "next/navigation";

// Révisions dupliquait presque intégralement Deck Profile (mulligan, courbe,
// cartes clés, synergies, matchups) en plus léger. Les 3 seules infos qui lui
// étaient propres (effet Leader, ordre des actions, calcul du létal) vivent
// maintenant dans la "Fiche express" en haut de Deck Profile. Redirection
// plutôt que suppression pure pour ne jamais casser un ancien lien/favori.
export default function RevisionsRedirect() {
  redirect("/deck-profile");
}
