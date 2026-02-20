import type { NextConfig } from "next";

// Configuration for Next.js app with API body size limit
const nextConfig: NextConfig = {
  api: {
    bodyParser: {
      sizeLimit: "50mb",
    },
  },
};

export default nextConfig;
