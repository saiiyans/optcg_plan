import { redirect } from "next/navigation";

// Les fiches détaillées par adversaire vivent maintenant sur /matchups
// (section dépliable "Plans de jeu par adversaire") — voir
// src/lib/matchupMerge.ts. Redirection plutôt que 404 pour un ancien lien.
export default function MatchupDetailRedirect() {
  redirect("/matchups");
}
