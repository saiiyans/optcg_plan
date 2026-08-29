import "./globals.css";
import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { NavLinks } from "@/components/NavLinks";
import { LeaderImage } from "@/components/LeaderImage";
import { HeaderTrainingCounter } from "@/components/HeaderTrainingCounter";
import { ConfirmDialogProvider } from "@/components/ConfirmDialogProvider";

// Police unique (refonte inspirée de Nakama Companion) — remplace
// Inter + Space Grotesk. Toutes les graisses utilisées dans l'app
// (texte courant 400/500, boutons 600, titres 700/800) sont chargées ici.
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Shopper — Coaching App",
  description: "Ton coach personnel OPTCG — Mihawk",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Shopper",
  },
  icons: {
    apple: "/apple-touch-icon.png",
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={manrope.variable}>
      <body className="bg-ink text-steel min-h-screen font-sans">
        <ConfirmDialogProvider>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-24 md:pb-6">
          <header className="sticky top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 mb-6 bg-ink/85 backdrop-blur-md border-b border-line">
            <div className="flex items-center justify-between gap-4">
              {/* Gauche : identité */}
              <div className="min-w-0 shrink-0 flex items-center gap-2.5">
                <img src="/logo-header.png" alt="Shopper" className="h-9 w-auto shrink-0" />
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-xl font-display font-semibold text-ivory leading-none">Shopper</h1>
                  <div className="text-[11px] text-textMuted mt-0.5 hidden sm:block">Coaching App — Mihawk Deck Intelligence</div>
                </div>
              </div>

              {/* Centre : navigation desktop uniquement — sur mobile elle est en bas d'écran.
                  Espacement élargi (gap-5) car le style du menu (relevé sur
                  nakamacompanion.com) est maintenant du texte plat sans fond
                  en pilule — il faut plus d'air entre les liens pour rester lisible.
                  Plus de scrollbar brute ici : avec 15 rubriques, NavLinks ne
                  montre plus qu'un socle de liens directs + un menu "Plus"
                  déroulant, qui tient dans n'importe quelle largeur d'écran
                  raisonnable sans jamais déborder ni se faire tronquer. */}
              <nav className="hidden md:flex items-center gap-5 text-sm">
                <NavLinks variant="top" />
              </nav>

              {/* Droite : compteur d'entraînement (visible desktop + mobile, section 3) + badge leader */}
              <div className="shrink-0 flex items-center gap-2.5">
                <HeaderTrainingCounter />
                <span className="hidden sm:inline-flex shrink-0 items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-full border border-emerald text-emerald-bright bg-emerald-dim/40">
                  <LeaderImage leaderKey="mihawk" size={18} />
                  OP14-020
                </span>
              </div>
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
        </ConfirmDialogProvider>
      </body>
    </html>
  );
}
