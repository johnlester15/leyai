import type { NextConfig } from "next";

// LeyAI Next.js Configuration
const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
