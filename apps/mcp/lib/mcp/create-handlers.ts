import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { verifyBearerToken } from "@/lib/auth";
import { resolveProjectAccess } from "@/lib/mcp/project-access";
import { registerAccountTools } from "@/lib/mcp/register-account-tools";
import { registerGraphTools } from "@/lib/mcp/register-graph-tools";
import { registerProjectTools } from "@/lib/mcp/register-project-tools";
import { parseMcpProjectScope } from "@/lib/mcp/resource-url";
import { resolveProjectId } from "@/lib/project-context";
import {
  buildMcpResourceUrl,
  mcpPublicOrigin,
  mcpResourceMetadataPath,
} from "@/lib/mcp/resource-url";

const mcpHandlerOptions = {
  serverInfo: { name: "ssota-mcp", version: "0.1.0" },
} as const;

const mcpTransportOptions = {
  basePath: "/api",
  verboseLogs: process.env.NODE_ENV === "development",
} as const;

const unifiedMcpHandler = createMcpHandler(
  (server) => {
    registerAccountTools(server as never);
    registerProjectTools(server as never);
    registerGraphTools(server as never);
  },
  mcpHandlerOptions,
  mcpTransportOptions,
);

/**
 * Single MCP auth path: JWT verification.
 * Project scope is resolved per tool call via orgSlug/projectSlug args
 * (with optional URL query defaults for backward compatibility).
 */
async function verifyMcpToken(
  req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> {
  const user = await verifyBearerToken(
    bearerToken ? `Bearer ${bearerToken}` : null,
  );
  if (!user) return undefined;

  const extra: Record<string, unknown> = { user };

  try {
    const urlScope = parseMcpProjectScope(req);
    if (urlScope) {
      const access = await resolveProjectAccess(
        user.id,
        urlScope.orgSlug,
        urlScope.projectSlug,
      );
      if (access) {
        extra.orgSlug = access.org.slug;
        extra.projectSlug = access.project.slug;
        extra.projectId = access.project.id;
      }
    }
  } catch {
    return undefined;
  }

  const headerProjectId = resolveProjectId(req);
  if (headerProjectId && !extra.projectId) {
    extra.projectId = headerProjectId;
  }

  return {
    token: bearerToken ?? "",
    clientId: user.id,
    scopes: ["openid"],
    extra,
  };
}

export const mcpAuthHandler = withMcpAuth(unifiedMcpHandler, verifyMcpToken, {
  required: true,
  resourceMetadataPath: mcpResourceMetadataPath(),
  resourceUrl: mcpPublicOrigin(),
});

/** @deprecated Use mcpAuthHandler — kept for imports that referenced accountAuthHandler. */
export const accountAuthHandler = mcpAuthHandler;

/** Single MCP URL — all tools; project scope via tool params. */
export async function dispatchMcpRequest(req: Request): Promise<Response> {
  return mcpAuthHandler(req);
}

export { buildMcpResourceUrl };
