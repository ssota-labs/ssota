// Next.js loads this on the server at startup. It wires Sentry into the
// correct runtime and captures errors thrown inside React Server Components,
// route handlers, and server actions via onRequestError.
//
// Sentry is opt-in: NEXT_PUBLIC_SENTRY_ENABLED=1 (see next.config.ts). When
// off, the Sentry runtime configs are never imported, so `Sentry.init` never
// runs and `captureRequestError` is a no-op (no client).
import * as Sentry from "@sentry/nextjs";

const sentryEnabled = process.env.NEXT_PUBLIC_SENTRY_ENABLED === "1";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerStubGateway } = await import("@ssota/agent-runtime");
    registerStubGateway();
    if (sentryEnabled) await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge" && sentryEnabled) {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
