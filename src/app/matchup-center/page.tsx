import { redirect } from "next/navigation";

// Matchup Center a fusionné avec /matchups (même contenu, plus de fiche
// séparée à maintenir à jour deux fois) — voir src/lib/matchupMerge.ts.
// Redirection plutôt que suppression pure : un ancien lien/favori ne doit
// jamais tomber sur une page 404.
export default function MatchupCenterRedirect() {
  redirect("/matchups");
}
