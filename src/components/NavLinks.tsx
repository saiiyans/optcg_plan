"use client";
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

// La nav du bas (mobile) reste volontairement limitée à 5 entrées maximum —
// au-delà, les zones tactiles deviennent trop petites sur petit écran.
const MOBILE_ITEMS = ITEMS.filter((i) => ["/cards", "/deck-profile", "/my-decks", "/prep", "/dashboard"].includes(i.href));

export function NavLinks({ variant }: { variant: "top" | "bottom" }) {
  const pathname = usePathname();

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

  return (
    <>
      {MOBILE_ITEMS.map((item) => {
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
    </>
  );
}
