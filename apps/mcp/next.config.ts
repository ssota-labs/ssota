import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

/** Sentry CLI expects an org slug; numeric SENTRY_ORG values mismatch auth tokens. */
function resolveSentryBuildOrg(): string | undefined {
  const org = process.env.SENTRY_ORG?.trim();
  if (!org || /^\d+$/.test(org)) return undefined;
  return org;
}

const nextConfig: NextConfig = {
  transpilePackages: [
    "@ssota/core",
    "@ssota/contracts",
    "@ssota/adapter-postgres",
    "@ssota/ui",
  ],
  allowedDevOrigins: ["127.0.0.1"],
};

// Sentry: wraps the build to upload source maps and instrument the runtime.
// No-op for events at runtime unless NEXT_PUBLIC_SENTRY_DSN is set; source
// maps upload only when SENTRY_AUTH_TOKEN/ORG/PROJECT are present (CI/Vercel).
export default withSentryConfig(nextConfig, {
  org: resolveSentryBuildOrg(),
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
