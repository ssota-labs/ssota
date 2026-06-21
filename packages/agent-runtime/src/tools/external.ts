import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { getCredentialProvider, getRunContext } from "./context.js";

/**
 * External-service tools (Phase 6 — Vercel Connect). Attached only when the
 * run has a credential provider. The agent names a `connector` and the runtime
 * resolves a scoped token for this account's installation and attaches it — the
 * raw token is never returned to the model.
 */
export function createExternalTools(): ToolSet {
  return {
    external_request: tool({
      description:
        "Make an HTTP request to an external service. Pass `connector` (e.g. 'shopify', 'slack') to attach this account's scoped credential as a Bearer token automatically. Returns status and (truncated) body.",
      inputSchema: z.object({
        url: z.string().url(),
        method: z
          .enum(["GET", "POST", "PUT", "PATCH", "DELETE"])
          .optional()
          .default("GET"),
        connector: z
          .string()
          .optional()
          .describe("Connector name whose scoped token to attach."),
        headers: z.record(z.string()).optional(),
        body: z.string().optional(),
      }),
      execute: async (input, { experimental_context }) => {
        const ctx = getRunContext(experimental_context);
        const provider = getCredentialProvider(experimental_context);

        const headers: Record<string, string> = { ...(input.headers ?? {}) };
        if (input.connector) {
          if (!provider) {
            return {
              ok: false,
              error: "No credential provider configured for this run.",
            };
          }
          const cred = await provider.getToken(input.connector, {
            projectId: ctx.projectId,
            accountId: ctx.accountId,
          });
          if (!cred) {
            return {
              ok: false,
              error: `No credential for connector '${input.connector}' (connect it first).`,
            };
          }
          headers.authorization = `Bearer ${cred.token}`;
        }

        try {
          const res = await fetch(input.url, {
            method: input.method,
            headers,
            body: input.body,
          });
          const text = await res.text();
          return {
            ok: res.ok,
            status: res.status,
            body: text.slice(0, 50_000),
          };
        } catch (error) {
          return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    }),
  };
}
