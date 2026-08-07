"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/cards", label: "Cartes", icon: "🃏" },
  { href: "/decks", label: "Winner Decks", icon: "🏆" },
  { href: "/my-decks", label: "Mes Decks", icon: "⭐" },
  { href: "/deck-profile", label: "Deck Profile", icon: "🦅" },
  { href: "/combo-lab", label: "Combo Lab", icon: "🧪" },
  { href: "/matchup-center", label: "Matchup Center", icon: "⚔️" },
  { href: "/prep", label: "Prépa", icon: "📋" },
  { href: "/compare", label: "Comparer", icon: "⚖️" },
  { href: "/dashboard", label: "Stats", icon: "📊" },
];

// La nav du bas (mobile) garde 4 accès directs + un bouton "Plus" qui ouvre
// le reste — impossible d'afficher les 9 pages en zones tactiles correctes
// sur un petit écran, mais toutes doivent rester atteignables.
const MOBILE_PRIMARY_HREFS = ["/cards", "/deck-profile", "/my-decks", "/prep"];
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
              className={`px-2.5 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                active ? "bg-emerald-dim text-emerald-bright" : "text-steel hover:text-ivory hover:bg-panel2"
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
            className={`flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium ${
              active ? "text-emerald-bright" : "text-steel/70"
            }`}
          >
            <span className="text-base leading-none">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}

      <button
        onClick={() => setMoreOpen((o) => !o)}
        className={`flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium ${
          moreActive || moreOpen ? "text-emerald-bright" : "text-steel/70"
        }`}
      >
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
                  className={`flex flex-col items-center justify-center gap-1 py-3 rounded-lg text-[11px] font-medium ${
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
