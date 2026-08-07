/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Images officielles servies depuis le CDN de Limitless — jamais copiées
    // localement par défaut (voir README, section "Images").
    remotePatterns: [
      { protocol: "https", hostname: "limitlesstcg.nyc3.cdn.digitaloceanspaces.com" },
      { protocol: "https", hostname: "onepiece.limitlesstcg.com" },
    ],
  },
  // @sparticuz/chromium et puppeteer-core (synchronisation Kaizoku) livrent
  // des fichiers binaires resolus par chemin relatif — si webpack les
  // regroupe normalement, ces chemins cassent et le binaire chromium n'est
  // plus trouvé au runtime sur Vercel ("input directory .../bin does not
  // exist"). Cette option les exclut du bundling.
  experimental: {
    serverComponentsExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  },
};

module.exports = nextConfig;
