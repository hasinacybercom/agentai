import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // ✅ Ignore ESLint errors during `next build`
    ignoreDuringBuilds: true,
  },
  devIndicators: false,
};

export default nextConfig;
