import "./globals.css";
import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { NavLinks } from "@/components/NavLinks";
import { LeaderImage } from "@/components/LeaderImage";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-space-grotesk", display: "swap" });

export const metadata: Metadata = {
  title: "Green Card Library — Mihawk OP14-020",
  description: "Bibliothèque personnelle des cartes vertes du One Piece Card Game",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="bg-ink text-steel min-h-screen font-sans">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-24 md:pb-6">
          <header className="sticky top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 mb-6 bg-ink/85 backdrop-blur-md border-b border-line">
            <div className="flex items-center justify-between gap-4">
              {/* Gauche : identité */}
              <div className="min-w-0 shrink-0">
                <h1 className="text-lg sm:text-xl font-display font-semibold text-ivory leading-none">Green Card Library</h1>
                <div className="text-[11px] text-textMuted mt-0.5 hidden sm:block">Competitive Mihawk Deck Intelligence</div>
              </div>

              {/* Centre : navigation desktop uniquement — sur mobile elle est en bas d'écran */}
              <nav className="hidden md:flex items-center gap-0.5 text-sm overflow-x-auto max-w-[min(60vw,900px)] scrollbar-thin">
                <NavLinks variant="top" />
              </nav>

              {/* Droite : badge leader */}
              <span className="hidden sm:inline-flex shrink-0 items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-full border border-emerald text-emerald-bright bg-emerald-dim/40">
                <LeaderImage leaderKey="mihawk" size={18} />
                OP14-020
              </span>
            </div>
          </header>

          <main>{children}</main>
        </div>

        {/* Barre de navigation fixe en bas, visible uniquement sur mobile */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-panel/95 backdrop-blur border-t border-line pb-[env(safe-area-inset-bottom)]">
          <div className="grid grid-cols-5">
            <NavLinks variant="bottom" />
          </div>
        </nav>
      </body>
    </html>
  );
}
