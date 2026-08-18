// Sentry initialization for the browser. Next.js loads this file automatically
// on the client. This app is mostly an MCP server with a minimal landing page,
// so we keep the client init lean (no session replay).
//
// Sentry is opt-in: NEXT_PUBLIC_SENTRY_ENABLED=1 (see next.config.ts). The
// literal `process.env.NEXT_PUBLIC_SENTRY_ENABLED` is inlined at build time, so
// when off the init block is dead code in the bundle.
import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_ENABLED === "1") {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  });
}

// Instruments App Router client-side navigations for tracing.
// No-op when Sentry was not initialized.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
