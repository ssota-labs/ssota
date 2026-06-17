import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@ssota/core",
    "@ssota/contracts",
    "@ssota/adapter-supabase",
    "@ssota/editor",
    "@ssota/ui",
    "@ssota/studio-preview-runtime",
    "@ssota/studio-renderer",
    "@blocknote/core",
    "@blocknote/react",
    "@blocknote/shadcn",
  ],
  serverExternalPackages: [
    "@tailwindcss/node",
    "lightningcss",
    "esbuild",
    "@ssota/studio-build",
  ],
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
