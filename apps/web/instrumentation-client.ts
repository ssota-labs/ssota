// Sentry initialization for the browser. Next.js loads this file automatically
// on the client (replaces the old sentry.client.config.ts).
//
// Sentry is opt-in: NEXT_PUBLIC_SENTRY_ENABLED=1 (see next.config.ts). The
// literal `process.env.NEXT_PUBLIC_SENTRY_ENABLED` is inlined at build time, so
// when off the whole init block (incl. Replay) is dead code in the bundle.
import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_ENABLED === "1") {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
    // Session Replay: record 10% of sessions, and 100% of sessions with an error.
    // Remove replayIntegration + these rates if you don't want replays.
    integrations: [Sentry.replayIntegration()],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

// Instruments App Router client-side navigations for tracing.
// No-op when Sentry was not initialized.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
