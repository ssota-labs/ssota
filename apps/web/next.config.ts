import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withSentryConfig } from "@sentry/nextjs";
import { withEmulate } from "@emulators/adapter-next";
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
    "@ssota/adapter-postgres",
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

// The agents run exclusively on the Vercel Workflow DevKit (WorkflowAgent), so
// the workflow build transform is always applied. Locally this uses the WDK
// "Local World" — no Vercel deployment required.
export default async function config(
  phase: string,
  ctx: { defaultConfig: NextConfig },
): Promise<NextConfig> {
  const { withWorkflow } = await import("workflow/next");
  let result: NextConfig | typeof config = withWorkflow(nextConfig);

  if (typeof result === "function") {
    result = await result(phase, ctx);
  }

  if (process.env.NODE_ENV !== "production") {
    result = withEmulate(result);
  }

  // Sentry: wraps the build to upload source maps and instrument the runtime.
  // No-op for events at runtime unless NEXT_PUBLIC_SENTRY_DSN is set; source
  // maps upload only when SENTRY_AUTH_TOKEN/ORG/PROJECT are present (CI/Vercel).
  return withSentryConfig(result, {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    silent: !process.env.CI,
    // Upload a wider set of client files for better stack traces.
    widenClientFileUpload: true,
    // Tree-shake Sentry's debug logger out of the client bundle.
    disableLogger: true,
  });
};
