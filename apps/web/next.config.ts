import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@ssota/core",
    "@ssota/contracts",
    "@ssota/adapter-supabase",
    "@ssota/ui",
  ],
  serverExternalPackages: ["@tailwindcss/node", "lightningcss"],
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
