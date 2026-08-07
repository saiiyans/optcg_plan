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
};

module.exports = nextConfig;
