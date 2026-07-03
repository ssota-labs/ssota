// Next.js loads this on the server at startup. It wires Sentry into the
// correct runtime and captures errors thrown inside React Server Components,
// route handlers, and server actions via onRequestError.
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerStubGateway } = await import("@ssota/agent-runtime");
    registerStubGateway();
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
