"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Accueil", icon: "🏠" },
  { href: "/cards", label: "Cartes", icon: "🃏" },
  { href: "/decks", label: "Winner Decks", icon: "🏆" },
  { href: "/my-decks", label: "Mes Decks", icon: "⭐" },
  { href: "/deck-profile", label: "Deck Profile", icon: "🦅" },
  { href: "/combo-lab", label: "Combo Lab", icon: "🧪" },
  { href: "/matchup-center", label: "Matchup Center", icon: "⚔️" },
  { href: "/tier-list", label: "Tier List", icon: "📶" },
  { href: "/prep", label: "Prépa", icon: "📋" },
  { href: "/dashboard", label: "Stats", icon: "📊" },
];

// La nav du bas (mobile) garde 4 accès directs + un bouton "Plus" qui ouvre
// le reste — impossible d'afficher les 10 pages en zones tactiles correctes
// sur un petit écran, mais toutes doivent rester atteignables.
const MOBILE_PRIMARY_HREFS = ["/", "/cards", "/prep", "/deck-profile"];
const MOBILE_PRIMARY = ITEMS.filter((i) => MOBILE_PRIMARY_HREFS.includes(i.href));
const MOBILE_MORE = ITEMS.filter((i) => !MOBILE_PRIMARY_HREFS.includes(i.href));

export function NavLinks({ variant }: { variant: "top" | "bottom" }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  if (variant === "top") {
    return (
      <>
        {ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-2.5 py-2 rounded-xl font-medium whitespace-nowrap transition-colors duration-150 border-b-2 ${
                active ? "bg-emerald-dim text-emerald-bright border-emerald" : "text-steel hover:text-ivory hover:bg-panel2 border-transparent"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </>
    );
  }

  const moreActive = MOBILE_MORE.some((i) => i.href === pathname);

  return (
    <>
      {MOBILE_PRIMARY.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex flex-col items-center justify-center gap-0.5 min-h-[44px] py-2.5 text-[10px] font-medium transition-colors duration-150 ${
              active ? "text-emerald-bright" : "text-steel/70"
            }`}
          >
            {active && <span className="absolute top-0.5 w-1 h-1 rounded-full bg-emerald" />}
            <span className="text-base leading-none">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}

      <button
        onClick={() => setMoreOpen((o) => !o)}
        className={`relative flex flex-col items-center justify-center gap-0.5 min-h-[44px] py-2.5 text-[10px] font-medium transition-colors duration-150 ${
          moreActive || moreOpen ? "text-emerald-bright" : "text-steel/70"
        }`}
      >
        {(moreActive || moreOpen) && <span className="absolute top-0.5 w-1 h-1 rounded-full bg-emerald" />}
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
                    active ? "bg-emerald-dim text-emerald-bright" : "text-steel hover:bg-panel2"
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
