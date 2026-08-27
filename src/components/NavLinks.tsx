"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Refonte IA (retour direct de l'utilisateur : trop de rubriques qui ne
// servent à rien dans un menu censé aider à jouer/progresser). Ce qui a
// changé par rapport à la liste plate à 15 entrées :
//  - Matchup Center + Matchups + Révisions racontaient la même histoire
//    (stratégie par leader adverse) avec 3 UI différentes → fusionnés en
//    UNE page (/matchups, voir src/lib/matchupMerge.ts). Les 2 autres
//    routes redirigent, rien n'est cassé pour un ancien lien.
//  - Prépa ne contenait plus que du contenu déjà parti ailleurs (sa propre
//    bannière le disait) → retirée, Planning/Objectifs vivent maintenant
//    dans le Journal (repliés par défaut). Redirige vers /journal.
//  - Leaders adverses est un outil de nettoyage de données (dédoublonnage),
//    pas une rubrique de coaching — relabellisé "Outils" et jamais en
//    accès direct, uniquement dans "Plus".
const ITEMS = [
  { href: "/dashboard", label: "Stats", icon: "📊" },
  { href: "/", label: "Accueil", icon: "🏠" },
  { href: "/journal", label: "Journal", icon: "📓" },
  { href: "/cards", label: "Cartes", icon: "🃏" },
  { href: "/deck-profile", label: "Deck Profile", icon: "🦅" },
  { href: "/matchups", label: "Matchups", icon: "🎯" },
  { href: "/decks", label: "Winner Decks", icon: "🏆" },
  { href: "/my-decks", label: "Mes Decks", icon: "⭐" },
  { href: "/tier-list", label: "Tier List", icon: "📶" },
  { href: "/card-tier-list", label: "Tier List Cartes", icon: "🃏" },
  { href: "/phase-tier-list", label: "Phase (DON!!)", icon: "⏱️" },
  { href: "/leaders", label: "Outils : leaders", icon: "🧹" },
];

// La nav du bas (mobile) garde 4 accès directs + un bouton "Plus" qui ouvre
// le reste — impossible d'afficher toutes les pages en zones tactiles
// correctes sur un petit écran, mais toutes doivent rester atteignables.
const MOBILE_PRIMARY_HREFS = ["/dashboard", "/", "/journal", "/matchups"];
const MOBILE_PRIMARY = ITEMS.filter((i) => MOBILE_PRIMARY_HREFS.includes(i.href));
const MOBILE_MORE = ITEMS.filter((i) => !MOBILE_PRIMARY_HREFS.includes(i.href));

// Nav du haut (desktop/tablette) : un socle de rubriques directes (le coeur
// "coach" de l'app) + un menu "Plus" pour le reste (decks/outils annexes),
// toujours dans le style plat de la référence (texte, pas de pilule).
const TOP_PRIMARY_HREFS = ["/dashboard", "/", "/journal", "/cards", "/deck-profile", "/matchups"];
const TOP_PRIMARY = ITEMS.filter((i) => TOP_PRIMARY_HREFS.includes(i.href));
const TOP_MORE = ITEMS.filter((i) => !TOP_PRIMARY_HREFS.includes(i.href));

export function NavLinks({ variant }: { variant: "top" | "bottom" }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  if (variant === "top") {
    // Style de menu relevé EXACTEMENT sur nakamacompanion.com : liens texte
    // plats, pas de fond en pilule, gris muted par défaut (#a0a0a0 —
    // steel), page active en blanc/gras avec un petit soulignement couleur
    // accent — pas de bordure ni de fond coloré comme dans l'ancienne
    // version (qui utilisait des pilules emerald empruntées au reste de
    // l'app plutôt qu'au style réel du site de référence).
    const linkClass = (active: boolean) =>
      `px-1 py-2 whitespace-nowrap transition-colors duration-150 border-b-2 ${
        active ? "text-ivory font-bold border-flame" : "text-steel font-medium border-transparent hover:text-ivory"
      }`;
    const moreActive = TOP_MORE.some((i) => i.href === pathname);

    return (
      <>
        {TOP_PRIMARY.map((item) => (
          <Link key={item.href} href={item.href} className={linkClass(pathname === item.href)}>
            {item.label}
          </Link>
        ))}

        <div className="relative">
          <button
            onClick={() => setMoreOpen((o) => !o)}
            className={`${linkClass(moreActive || moreOpen)} inline-flex items-center gap-1`}
          >
            Plus
            <span className={`text-[10px] transition-transform duration-150 ${moreOpen ? "rotate-180" : ""}`}>▾</span>
          </button>

          {moreOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)} />
              <div className="absolute right-0 top-full mt-2 z-50 w-56 bg-panel border border-line rounded-xl p-1.5 shadow-elevated">
                {TOP_MORE.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors duration-150 ${
                        active ? "bg-flame/15 text-ivory font-bold" : "text-steel font-medium hover:bg-panel2 hover:text-ivory"
                      }`}
                    >
                      <span className="text-base leading-none">{item.icon}</span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </>
    );
  }

  const moreActive = MOBILE_MORE.some((i) => i.href === pathname);

  return (
    <>
      {/* Barre du bas mobile — mêmes couleurs que le menu du haut (accent
          flame pour l'état actif au lieu d'emerald), cohérent avec le
          style plat de nakamacompanion.com. */}
      {MOBILE_PRIMARY.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex flex-col items-center justify-center gap-0.5 min-h-[44px] py-2.5 text-[10px] font-medium transition-colors duration-150 ${
              active ? "text-ivory font-bold" : "text-steel/70"
            }`}
          >
            {active && <span className="absolute top-0.5 w-1 h-1 rounded-full bg-flame" />}
            <span className="text-base leading-none">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}

      <button
        onClick={() => setMoreOpen((o) => !o)}
        className={`relative flex flex-col items-center justify-center gap-0.5 min-h-[44px] py-2.5 text-[10px] font-medium transition-colors duration-150 ${
          moreActive || moreOpen ? "text-ivory font-bold" : "text-steel/70"
        }`}
      >
        {(moreActive || moreOpen) && <span className="absolute top-0.5 w-1 h-1 rounded-full bg-flame" />}
        <span className="text-base leading-none">⋯</span>
        Plus
      </button>

      {moreOpen && (
        <>
          {/* Fond cliquable pour fermer le menu */}
          <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)} />
          <div className="fixed bottom-[64px] left-3 right-3 z-50 bg-panel border border-line rounded-xl p-2 grid grid-cols-3 gap-1 shadow-elevated">
            {MOBILE_MORE.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={`flex flex-col items-center justify-center gap-1 min-h-[44px] py-3 rounded-xl text-[11px] font-medium transition-colors duration-150 ${
                    active ? "bg-flame/15 text-ivory font-bold" : "text-steel hover:bg-panel2"
                  }`}
                >
                  <span className="text-lg leading-none">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
