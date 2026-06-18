import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";
import traceManifest from "../../packages/studio-build/studio-trace-manifest.json" with {
  type: "json",
};

const configDir = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.join(configDir, "../..");

/** Package-level globs derived from esbuild metafile (studio-build generate:trace-manifest). */
const studioBuildTraceIncludes = [
  ...traceManifest.globs.map((glob) => `../../${glob}`),
  "../../packages/studio-build/dist/**/*",
  "../../packages/studio-build/src/**/*",
];

const nextConfig: NextConfig = {
  outputFileTracingRoot: monorepoRoot,
  outputFileTracingIncludes: {
    "/api/studio/build": studioBuildTraceIncludes,
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
