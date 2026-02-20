import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  api: {
    bodyParser: {
      sizeLimit: "50mb", // Support up to 50MB file uploads
    },
    responseLimit: "50mb",
  },
};

export default nextConfig;
