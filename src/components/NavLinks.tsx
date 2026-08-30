"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Refonte navigation (espace de préparation tournoi) — 5 besoins
// principaux, chacun avec UNE destination directe + ses fonctions
// secondaires regroupées dessous plutôt que noyées dans une liste plate de
// 14 rubriques :
//  1. Accueil        -> /
//  2. Jouer           -> /journal (+ Jour J, Quiz Mulligan)
//  3. Coach           -> /matchups (+ Deck Profile, Cartes, Tier Lists)
//  4. Decks           -> /decks (+ Mes Decks)
//  5. Progression     -> /dashboard (+ Outils : leaders)
//
// Les 5 destinations principales sont toujours des liens directs (barre du
// haut en desktop, barre du bas en mobile — jamais plus de 5 icônes,
// jamais un menu déroulant pour l'accès essentiel). Le reste ("Plus") est
// group par thème avec un petit en-tête, pas une liste plate.
type NavGroup = "jouer" | "coach" | "decks" | "progression";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  group: NavGroup;
  primary?: boolean; // destination directe du groupe (barre principale)
}

const ITEMS: NavItem[] = [
  { href: "/journal", label: "Journal", icon: "📓", group: "jouer", primary: true },
  { href: "/tournament-day", label: "Jour J", icon: "⚔️", group: "jouer" },
  { href: "/mulligan-quiz", label: "Quiz Mulligan", icon: "🧠", group: "jouer" },

  { href: "/matchups", label: "Coach & Matchups", icon: "🎯", group: "coach", primary: true },
  { href: "/deck-profile", label: "Deck Profile", icon: "🦅", group: "coach" },
  { href: "/cards", label: "Cartes", icon: "🃏", group: "coach" },
  { href: "/tier-list", label: "Tier List", icon: "📶", group: "coach" },
  { href: "/learn", label: "Apprentissage", icon: "📚", group: "coach" },
  { href: "/card-tier-list", label: "Tier List Cartes", icon: "🃏", group: "coach" },
  { href: "/phase-tier-list", label: "Phase (DON!!)", icon: "⏱️", group: "coach" },

  { href: "/decks", label: "Winner Decks", icon: "🏆", group: "decks", primary: true },
  { href: "/my-decks", label: "Mes Decks", icon: "⭐", group: "decks" },

  { href: "/dashboard", label: "Progression", icon: "📊", group: "progression", primary: true },
  { href: "/leaders", label: "Outils : leaders", icon: "🧹", group: "progression" },
];

const GROUP_LABEL: Record<NavGroup, string> = {
  jouer: "Jouer",
  coach: "Coach",
  decks: "Decks",
  progression: "Progression",
};
const GROUP_ORDER: NavGroup[] = ["jouer", "coach", "decks", "progression"];

const ACCUEIL: NavItem = { href: "/", label: "Accueil", icon: "🏠", group: "jouer" }; // group ignoré ici

// Desktop : les 5 destinations directes (Accueil + 4 groupes), chacune avec
// son propre sous-menu déroulant — pas de contrainte de largeur sur grand
// écran, donc pas besoin de compromis.
const PRIMARY_ITEMS: NavItem[] = [ACCUEIL, ...ITEMS.filter((i) => i.primary)];

// Mobile : 4 icônes directes maximum + le bouton "Plus" (5 au total, jamais
// plus — contrainte explicite tactile). "Progression" est déjà largement
// couvert par le widget du jour sur l'Accueil, donc c'est le groupe qui
// passe dans "Plus" plutôt que d'occuper une 5e icône fixe.
const MOBILE_DIRECT_GROUPS: NavGroup[] = ["jouer", "coach", "decks"];
const MOBILE_PRIMARY_ITEMS: NavItem[] = [ACCUEIL, ...ITEMS.filter((i) => i.primary && MOBILE_DIRECT_GROUPS.includes(i.group))];

function groupOf(pathname: string): NavGroup | null {
  const item = ITEMS.find((i) => i.href === pathname);
  return item ? item.group : null;
}

export function NavLinks({ variant }: { variant: "top" | "bottom" }) {
  const pathname = usePathname();
  const [openGroup, setOpenGroup] = useState<NavGroup | null>(null);
  const activeGroup = groupOf(pathname);

  if (variant === "top") {
    // Style de menu relevé sur nakamacompanion.com : liens texte plats, pas
    // de fond en pilule, gris muted par défaut (steel), page active en
    // blanc/gras avec un petit soulignement couleur accent.
    const linkClass = (active: boolean) =>
      `px-1 py-2 whitespace-nowrap transition-colors duration-150 border-b-2 ${
        active ? "text-ivory font-bold border-flame" : "text-steel font-medium border-transparent hover:text-ivory"
      }`;

    return (
      <>
        {PRIMARY_ITEMS.map((item) => {
          const groupItems = ITEMS.filter((i) => i.group === item.group && i.href !== item.href);
          const isActiveGroup = item.href === "/" ? pathname === "/" : activeGroup === item.group;
          if (groupItems.length === 0) {
            return (
              <Link key={item.href} href={item.href} className={linkClass(pathname === item.href)}>
                {item.label}
              </Link>
            );
          }
          return (
            <div key={item.href} className="relative">
              <div className="flex items-stretch">
                <Link href={item.href} className={linkClass(isActiveGroup)}>
                  {item.label}
                </Link>
                <button
                  onClick={() => setOpenGroup((g) => (g === item.group ? null : item.group))}
                  className={`${linkClass(isActiveGroup || openGroup === item.group)} px-0.5`}
                  aria-label={`Plus dans ${item.label}`}
                >
                  <span className={`text-[10px] inline-block transition-transform duration-150 ${openGroup === item.group ? "rotate-180" : ""}`}>▾</span>
                </button>
              </div>

              {openGroup === item.group && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setOpenGroup(null)} />
                  <div className="absolute right-0 top-full mt-2 z-50 w-56 bg-panel border border-line rounded-xl p-1.5 shadow-elevated">
                    {groupItems.map((sub) => {
                      const active = pathname === sub.href;
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={() => setOpenGroup(null)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors duration-150 ${
                            active ? "bg-flame/15 text-ivory font-bold" : "text-steel font-medium hover:bg-panel2 hover:text-ivory"
                          }`}
                        >
                          <span className="text-base leading-none">{sub.icon}</span>
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </>
    );
  }

  // --- Mobile : barre du bas, 5 icônes maximum (Accueil + 4 groupes),
  // safe-area iOS respectée (padding géré par le conteneur parent dans
  // layout.tsx via env(safe-area-inset-bottom) — voir globals.css). Le
  // bouton "Plus" par groupe ouvre une feuille groupée par thème plutôt
  // qu'une liste plate de 9 rubriques secondaires.
  const onlyInPlus = activeGroup !== null && !MOBILE_DIRECT_GROUPS.includes(activeGroup);

  return (
    <>
      {MOBILE_PRIMARY_ITEMS.map((item) => {
        const isActiveGroup = item.href === "/" ? pathname === "/" : activeGroup === item.group;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex flex-col items-center justify-center gap-0.5 min-h-[44px] py-2.5 text-[10px] font-medium transition-colors duration-150 ${
              isActiveGroup ? "text-ivory font-bold" : "text-steel/70"
            }`}
          >
            {isActiveGroup && <span className="absolute top-0.5 w-1 h-1 rounded-full bg-flame" />}
            <span className="text-base leading-none">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}

      <button
        onClick={() => setOpenGroup((g) => (g ? null : "progression"))}
        className={`relative flex flex-col items-center justify-center gap-0.5 min-h-[44px] py-2.5 text-[10px] font-medium transition-colors duration-150 ${
          openGroup || onlyInPlus ? "text-ivory font-bold" : "text-steel/70"
        }`}
      >
        {onlyInPlus && !openGroup && <span className="absolute top-0.5 w-1 h-1 rounded-full bg-flame" />}
        <span className="text-base leading-none">⋯</span>
        Plus
      </button>

      {openGroup && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpenGroup(null)} />
          <div className="fixed bottom-[calc(64px+env(safe-area-inset-bottom))] left-3 right-3 z-50 bg-panel border border-line rounded-xl p-3 max-h-[70vh] overflow-y-auto shadow-elevated space-y-3">
            {GROUP_ORDER.map((g) => (
              <div key={g}>
                <div className="text-[10px] font-mono uppercase tracking-widest text-steel/50 mb-1.5 flex items-center gap-2">
                  <button onClick={() => setOpenGroup(openGroup === g ? null : g)} className="flex-1 text-left">
                    {GROUP_LABEL[g]}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {ITEMS.filter((i) => i.group === g).map((item) => {
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpenGroup(null)}
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
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
