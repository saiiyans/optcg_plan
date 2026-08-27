import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Alias historiques (utilisés dans tout le code existant) — remappés
        // vers la palette EXACTE de nakamacompanion.com (relevée en
        // inspectant les variables CSS --bg/--ink/--accent/--surface-* du
        // site réel, pas une approximation). Aucune classe Tailwind n'a
        // besoin de changer dans les fichiers qui les consomment déjà :
        // seules les valeurs changent.
        ink: "#111111", // --bg (nakamacompanion.com)
        panel: "#161616", // --surface-1
        panel2: "#1a1a1a", // --surface-2 (cards/panels)
        surfaceHover: "#2a2a2a", // --surface-5
        line: "rgba(255, 255, 255, 0.10)", // --line
        lineStrong: "rgba(255, 255, 255, 0.16)", // --line-strong
        emerald: {
          DEFAULT: "#36D98B", // --primary-accent
          bright: "#7CF5B3", // --secondary-green
          dim: "#122A20", // fond sombre desaturé pour pastilles/badges
        },
        steel: "#a0a0a0", // --muted (nakamacompanion.com)
        textMuted: "#909090", // --muted-2
        ivory: "#f0f0f0", // --ink (nakamacompanion.com)
        gold: "#F5C451", // --gold / achievement (spécifique à l'app, pas de la palette Nakama)
        danger: "#FF5C64", // --error / loss
        // Accent "flame" = --accent / --accent2 EXACTS de nakamacompanion.com
        // (couleur pleine, jamais un dégradé — vérifié sur le site réel :
        // aucun titre ni bouton n'utilise de gradient). Réservé aux
        // boutons d'action principaux et accents de marque. Ne remplace PAS
        // emerald (favorable/victoire) ni danger (défavorable/défaite)
        // ailleurs dans l'app : ces couleurs restent sémantiques partout où
        // elles sont déjà utilisées.
        flame: {
          DEFAULT: "#E63946", // --accent
          light: "#F4A261", // --accent2 (usage rare, jamais en dégradé avec DEFAULT)
          hover: "#CF2D3A", // --accent-hover
        },
      },
      fontFamily: {
        // Manrope PARTOUT, y compris pour font-mono (refonte, relevé exact
        // sur nakamacompanion.com) — leur site n'utilise aucune police à
        // chasse fixe nulle part (nav, boutons, titres, chiffres : tout est
        // en Manrope). L'app utilisait encore JetBrains Mono pour beaucoup
        // de labels/badges/statistiques via la classe font-mono ; en
        // remappant le token ici, tout ce qui utilise déjà font-mono dans
        // les ~50 fichiers existants bascule automatiquement sur Manrope,
        // sans avoir à retoucher chaque fichier un par un.
        sans: ["var(--font-manrope)", "system-ui", "sans-serif"],
        display: ["var(--font-manrope)", "system-ui", "sans-serif"],
        mono: ["var(--font-manrope)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // Ombres très légères — la palette sombre + les bordures subtiles
        // suffisent à créer la hiérarchie, pas besoin d'ombres marquées.
        card: "0 1px 0 rgba(255,255,255,0.02) inset, 0 4px 16px -10px rgba(0,0,0,0.5)",
        elevated: "0 1px 0 rgba(255,255,255,0.03) inset, 0 12px 32px -16px rgba(0,0,0,0.6)",
      },
      borderRadius: {
        // Système d'arrondis unifié pour la refonte (12-16px) — les classes
        // rounded-lg/rounded-xl existantes en profitent automatiquement.
        lg: "12px",
        xl: "14px",
        "2xl": "16px",
      },
    },
  },
  plugins: [],
};
export default config;
