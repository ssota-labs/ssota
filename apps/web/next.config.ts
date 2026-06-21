import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";
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
    "@ssota/agent-runtime",
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
    // Optional native deps of chat adapters (used only in gateway/socket mode,
    // not our webhook mode) — leave them external so Turbopack doesn't bundle.
    "zlib-sync",
    "bufferutil",
    "utf-8-validate",
  ],
  allowedDevOrigins: ["127.0.0.1"],
};

export default withWorkflow(nextConfig);
