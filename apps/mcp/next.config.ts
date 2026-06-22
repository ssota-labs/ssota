import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@ssota/core",
    "@ssota/contracts",
    "@ssota/adapter-postgres",
    "@ssota/ui",
  ],
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
