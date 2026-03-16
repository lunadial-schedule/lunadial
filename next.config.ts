import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.pstatic.net",
      },
      {
        protocol: "https",
        hostname: "livecloud-thumb.akamaized.net",
      },
    ],
  },
};

export default nextConfig;
