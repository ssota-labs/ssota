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

/** Sentry CLI expects an org slug; numeric SENTRY_ORG values mismatch auth tokens. */
function resolveSentryBuildOrg(): string | undefined {
  const org = process.env.SENTRY_ORG?.trim();
  if (!org || /^\d+$/.test(org)) return undefined;
  return org;
}

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
    // Workflow step bundle: keep CJS-only deps external so esbuild does not
    // emit dynamic require stubs Turbopack cannot evaluate at collect-page-data.
    "@vercel/oidc",
    "@vercel/connect",
    "semver",
    "pusher-js",
    "ajv",
    // Optional native deps of chat adapters (used only in gateway/socket mode,
    // not our webhook mode) — leave them external so Turbopack doesn't bundle.
    "zlib-sync",
    "bufferutil",
    "utf-8-validate",
  ],
  allowedDevOrigins: ["127.0.0.1"],
};

// The agents run exclusively on the Vercel Workflow DevKit (WorkflowAgent).
// Local `pnpm --filter web dev` skips the transform (SSOTA_SKIP_WORKFLOW=1) so
// Company Workspace pages do not pay a 1–5 min "Discovering workflow directives"
// scan. Opt in with `pnpm --filter web dev:workflow` or SSOTA_SKIP_WORKFLOW=0.
// Playwright UI specs also default to skip — see e2e/playwright.config.ts.
export default async function config(
  phase: string,
  ctx: { defaultConfig: NextConfig },
): Promise<NextConfig> {
  let result: NextConfig | typeof config = nextConfig;
  if (process.env.SSOTA_SKIP_WORKFLOW !== "1") {
    const { withWorkflow } = await import("workflow/next");
    result = withWorkflow(nextConfig);
  }

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
    org: resolveSentryBuildOrg(),
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    silent: !process.env.CI,
    // Upload a wider set of client files for better stack traces.
    widenClientFileUpload: true,
    webpack: {
      treeshake: {
        removeDebugLogging: true,
      },
    },
  });
};
