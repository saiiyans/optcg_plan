/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Images officielles servies depuis le CDN de Limitless — jamais copiées
    // localement par défaut (voir README, section "Images").
    remotePatterns: [
      { protocol: "https", hostname: "limitlesstcg.nyc3.cdn.digitaloceanspaces.com" },
      { protocol: "https", hostname: "onepiece.limitlesstcg.com" },
      // Source des images OP17 leak/reveal — voir /api/admin/import-op17-leaks
      { protocol: "https", hostname: "spellmana.com" },
    ],
  },
  // @sparticuz/chromium et puppeteer-core (synchronisation Kaizoku) livrent
  // des fichiers binaires resolus par chemin relatif — si webpack les
  // regroupe normalement, ces chemins cassent et le binaire chromium n'est
  // plus trouvé au runtime sur Vercel ("input directory .../bin does not
  // exist"). serverComponentsExternalPackages évite le bundling webpack ;
  // outputFileTracingIncludes force en plus Vercel à inclure le dossier
  // bin/ dans le paquet déployé de ces deux routes précises (sans lui,
  // le traceur de fichiers de Vercel ne détecte pas ce dossier tout seul,
  // car il est chargé par chemin relatif au runtime, pas par un simple
  // require() statique qu'il pourrait suivre).
  experimental: {
    serverComponentsExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
    outputFileTracingIncludes: {
      "/api/cron/sync-kaizoku": ["node_modules/@sparticuz/chromium/**/*"],
      "/api/cron/sync-kaizoku/route": ["node_modules/@sparticuz/chromium/**/*"],
      "/api/matches/refresh-kaizoku": ["node_modules/@sparticuz/chromium/**/*"],
      "/api/matches/refresh-kaizoku/route": ["node_modules/@sparticuz/chromium/**/*"],
    },
  },
};

module.exports = nextConfig;
