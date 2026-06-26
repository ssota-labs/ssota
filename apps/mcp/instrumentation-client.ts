// Sentry initialization for the browser. Next.js loads this file automatically
// on the client. This app is mostly an MCP server with a minimal landing page,
// so we keep the client init lean (no session replay).
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
});

// Instruments App Router client-side navigations for tracing.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
