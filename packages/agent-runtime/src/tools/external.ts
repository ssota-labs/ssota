import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { createAccountConnectionPort } from "@ssota/adapter-postgres";
import { getDb } from "../ports.js";
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
          // Scope the token to this account's installation for the connector
          // (Slack team, GitHub org, …) so the agent acts on the right tenant.
          const connectScope = ctx.accountId
            ? await createAccountConnectionPort(getDb()).getConnectCredentialScope(
                ctx.accountId,
                input.connector,
              )
            : null;
          const cred = await provider.getToken(input.connector, {
            projectId: ctx.projectId,
            accountId: ctx.accountId,
            installationId: connectScope?.installationId ?? undefined,
            userId: connectScope?.subjectUserId ?? undefined,
          });
          if (!cred) {
            return {
              ok: false,
              error: `No credential for connector '${input.connector}'. Call request_connection with this connector so the user can connect it, then stop.`,
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

    request_connection: tool({
      description:
        "Ask the user to connect a third-party service when a connector is not yet authorized. Call this (instead of failing) when `external_request` reports a missing credential. The chat UI renders a connect card with a button; the run should then stop and wait for the user to connect.",
      inputSchema: z.object({
        connector: z
          .string()
          .describe(
            "Connector to request, e.g. 'slack', 'notion', 'github', 'linear', 'discord'.",
          ),
        reason: z
          .string()
          .describe("Short, user-facing reason this connection is needed."),
      }),
      execute: async (input, { experimental_context }) => {
        const ctx = getRunContext(experimental_context);
        // Returned as a `tool-request_connection` UI part; the chat front-end
        // builds the `/api/connect/authorize` URL from this descriptor.
        return {
          connectionRequired: true as const,
          connector: input.connector,
          reason: input.reason,
          projectId: ctx.projectId,
          accountId: ctx.accountId ?? null,
        };
      },
    }),
  };
}
