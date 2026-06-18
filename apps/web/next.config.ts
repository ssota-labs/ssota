import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.join(configDir, "../..");

const studioBuildTraceIncludes = [
  "../../packages/ui/**/*",
  "../../packages/studio-preview-runtime/**/*",
  "../../packages/studio-build/**/*",
  "../../node_modules/react/**/*",
  "../../node_modules/react-dom/**/*",
  "../../node_modules/@ssota/ui/**/*",
  "../../node_modules/@base-ui/**/*",
  "../../node_modules/clsx/**/*",
  "../../node_modules/class-variance-authority/**/*",
  "../../node_modules/tailwind-merge/**/*",
  "../../node_modules/@phosphor-icons/**/*",
];

const nextConfig: NextConfig = {
  outputFileTracingRoot: monorepoRoot,
  outputFileTracingIncludes: {
    "/api/studio/build": studioBuildTraceIncludes,
    "/[orgSlug]/[projectSlug]/design/ui-components/[componentId]": studioBuildTraceIncludes,
  },
  transpilePackages: [
    "@ssota/core",
    "@ssota/contracts",
    "@ssota/adapter-supabase",
    "@ssota/editor",
    "@ssota/ui",
    "@ssota/studio-preview-runtime",
    "@ssota/studio-renderer",
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
