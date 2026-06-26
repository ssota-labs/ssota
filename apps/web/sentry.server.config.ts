// Sentry initialization for the Node.js server runtime.
// Loaded from instrumentation.ts when NEXT_RUNTIME === "nodejs".
// With no NEXT_PUBLIC_SENTRY_DSN set, Sentry is inert (self-host / local dev).
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Sample 10% of transactions in prod, everything in dev.
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  // Only emit events when a DSN is configured.
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
});
