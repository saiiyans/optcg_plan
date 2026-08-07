import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Alias historiques (utilisés dans tout le code existant) — remappés
        // vers la nouvelle palette "Premium Competitive TCG Dashboard" pour
        // transformer visuellement l'app sans devoir renommer chaque classe.
        ink: "#07100d", // --background
        panel: "#0d1914", // --surface
        panel2: "#13221b", // --surface-elevated
        surfaceHover: "#192d23",
        line: "rgba(144, 196, 164, 0.16)", // --border
        lineStrong: "rgba(144, 196, 164, 0.30)", // --border-strong
        emerald: {
          DEFAULT: "#3fc47c",
          bright: "#66e49c",
          dim: "#204f37", // --emerald-muted, utilisé comme fond de pastille
        },
        steel: "#aab9b0", // --text-secondary
        textMuted: "#708078",
        ivory: "#f4f1e8",
        gold: "#e4b94f",
        danger: "#ed6a6a",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        mono: ["'JetBrains Mono'", "'Courier New'", "monospace"],
      },
      boxShadow: {
        card: "0 1px 0 rgba(255,255,255,0.03) inset, 0 8px 24px -14px rgba(0,0,0,0.65)",
        elevated: "0 1px 0 rgba(255,255,255,0.04) inset, 0 16px 40px -18px rgba(0,0,0,0.75)",
      },
    },
  },
  plugins: [],
};
export default config;
