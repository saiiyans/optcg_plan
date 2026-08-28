// Fiche express Mihawk — les 3 rappels essentiels "à relire avant de jouer"
// (effet Leader, ordre des actions, calcul du létal). À l'origine écrite en
// dur uniquement dans Deck Profile (ex-page Révisions fusionnée là-bas) ;
// extraite ici en composant partagé pour être réutilisée telle quelle sur
// /tournament-day (Mode Jour de Tournoi) sans dupliquer le texte à la main
// dans un deuxième fichier — un seul endroit à corriger si l'effet leader
// ou le rappel du calcul du létal doit un jour être reformulé.
export function FicheExpressMihawk() {
  return (
    <div className="card-tile p-5 border-gold/40">
      <h2 className="font-mono text-xs uppercase tracking-widest text-gold mb-3 border-b border-line pb-2">⚡ Fiche express — à relire avant de jouer</h2>
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-bright mb-1.5">Effet du Leader</div>
          <p className="text-xs text-steel/90 leading-relaxed">
            Si le Leader adverse a l'attribut Slash, Mihawk gagne +1000 de puissance.
            [Activate: Main] [Once Per Turn] Repose 1 de tes cartes : si tu as un personnage coût 5 ou plus, réactive jusqu'à 3 de tes DON!!. Tu ne peux alors plus jouer de personnage ce tour.
          </p>
          <p className="text-[11px] text-red-400 mt-1.5">⚠ Ne joue aucun personnage — il ne fait que réactiver du DON!!.</p>
        </div>
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-bright mb-1.5">Ordre correct des actions</div>
          <ol className="text-xs text-steel/90 space-y-1 list-decimal list-inside">
            <li>Joue tes personnages nécessaires d'abord</li>
            <li>Active l'effet Leader Mihawk ensuite</li>
            <li>Calcule le létal avant ta première attaque</li>
            <li>Attaque dans l'ordre qui force les pires Counters adverses</li>
          </ol>
        </div>
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-bright mb-1.5">Calcul du létal</div>
          <ul className="text-xs text-steel/90 space-y-1 list-disc list-inside">
            <li>Additionne la puissance de tous tes attaquants disponibles</li>
            <li>Compare aux vies adverses restantes, pas à la puissance du Leader seul</li>
            <li>Compte le Counter adverse probable AVANT de déclarer l'attaque</li>
            <li>Vérifie toujours le létal avant une carte qui pourrait le rater</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
