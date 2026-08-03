import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hbgiufhgezbkjynwvfsx.supabase.co",
        pathname: "/storage/v1/object/**",
      },
      // Anúncios são cadastrados manualmente pelo admin e podem vir de qualquer
      // domínio externo — liberado como fallback pra não quebrar o painel.
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
