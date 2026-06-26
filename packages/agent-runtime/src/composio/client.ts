/**
 * Composio client singleton, configured with the Vercel AI SDK provider so
 * `session.tools()` returns an AI-SDK ToolSet that drops straight into the
 * runtime's ToolLoopAgent. Composio holds the OAuth tokens; the agent only sees
 * tool results. Gated on `COMPOSIO_API_KEY` — absent → connectors are detached.
 */
import { Composio } from "@composio/core";
import { VercelProvider } from "@composio/vercel";

type ComposioVercel = Composio<VercelProvider>;

let cached: ComposioVercel | null | undefined;

export function isComposioEnabled(): boolean {
  return Boolean(process.env.COMPOSIO_API_KEY);
}

/** The shared Composio client, or null when `COMPOSIO_API_KEY` is unset. */
export function getComposioClient(): ComposioVercel | null {
  if (cached !== undefined) return cached;
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) {
    cached = null;
    return null;
  }
  // strict: drop non-required props so models that reject optional params still work.
  cached = new Composio({ apiKey, provider: new VercelProvider({ strict: true }) });
  return cached;
}
