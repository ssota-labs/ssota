import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@loopos/core", "@loopos/contracts", "@loopos/adapter-supabase"],
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
