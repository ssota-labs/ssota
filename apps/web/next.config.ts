import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@loopos/core", "@loopos/contracts", "@loopos/adapter-supabase"],
};

export default nextConfig;
