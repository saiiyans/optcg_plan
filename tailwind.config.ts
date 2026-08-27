import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Alias historiques (utilisés dans tout le code existant) — remappés
        // vers la palette "Competitive TCG Performance App" (refonte
        // graphique). Aucune classe Tailwind n'a besoin de changer dans les
        // ~50 fichiers qui les consomment déjà : seules les valeurs changent.
        ink: "#090B0F", // --background
        panel: "#10141B", // --surface
        panel2: "#151A22", // --surface-elevated / cards-panels
        surfaceHover: "#1A2029",
        line: "rgba(255, 255, 255, 0.07)", // --border
        lineStrong: "rgba(255, 255, 255, 0.16)", // --border-strong
        emerald: {
          DEFAULT: "#36D98B", // --primary-accent
          bright: "#7CF5B3", // --secondary-green
          dim: "#122A20", // fond sombre desaturé pour pastilles/badges
        },
        steel: "#98A2B3", // --text-secondary
        textMuted: "#667085", // --muted
        ivory: "#F5F7FA", // --text
        gold: "#F5C451", // --gold / achievement
        danger: "#FF5C64", // --error / loss
        // Accent "flame" (refonte inspirée de Nakama Companion, sections
        // Cartes/Méta actuelle) — rouge -> orange, réservé aux en-têtes et
        // boutons d'action principaux de ces pages. Ne remplace PAS emerald
        // (favorable/victoire) ni danger (défavorable/défaite) ailleurs
        // dans l'app : ces couleurs restent sémantiques partout où elles
        // sont déjà utilisées.
        flame: {
          DEFAULT: "#E63946",
          light: "#F4A261",
        },
      },
      fontFamily: {
        // Manrope partout (refonte) — remplace Inter + Space Grotesk pour
        // coller au style typographique de Nakama Companion (une seule
        // famille, du 400 au 800, plutôt que deux familles séparées).
        sans: ["var(--font-manrope)", "system-ui", "sans-serif"],
        display: ["var(--font-manrope)", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "'Courier New'", "monospace"],
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
