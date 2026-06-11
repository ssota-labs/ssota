import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { verifyBearerToken } from "@/lib/auth";
import { resolveProjectAccess } from "@/lib/mcp/project-access";
import { registerAccountTools } from "@/lib/mcp/register-account-tools";
import { registerProjectTools } from "@/lib/mcp/register-project-tools";
import { resolveProjectId } from "@/lib/project-context";
import { resolveSubjectId } from "@/lib/subject-context";
import { buildMcpResourceUrl, mcpPublicOrigin } from "@/lib/mcp/resource-url";

const mcpHandlerOptions = {
  serverInfo: { name: "ssota-mcp", version: "0.1.0" },
} as const;

const mcpTransportOptions = {
  basePath: "/api",
  verboseLogs: process.env.NODE_ENV === "development",
} as const;

const accountMcpHandler = createMcpHandler(
  (server) => {
    registerAccountTools(server as never);
  },
  mcpHandlerOptions,
  mcpTransportOptions,
);

const projectMcpHandler = createMcpHandler(
  (server) => {
    registerProjectTools(server as never);
  },
  mcpHandlerOptions,
  mcpTransportOptions,
);

async function verifyAccountToken(
  _req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> {
  const user = await verifyBearerToken(
    bearerToken ? `Bearer ${bearerToken}` : null,
  );
  if (!user) return undefined;

  return {
    token: bearerToken ?? "",
    clientId: user.id,
    scopes: ["openid"],
    extra: { user },
  };
}

function createVerifyProjectToken(orgSlug: string, projectSlug: string) {
  return async function verifyProjectToken(
    req: Request,
    bearerToken?: string,
  ): Promise<AuthInfo | undefined> {
    const user = await verifyBearerToken(
      bearerToken ? `Bearer ${bearerToken}` : null,
    );
    if (!user) return undefined;

    const access = await resolveProjectAccess(user.id, orgSlug, projectSlug);
    if (!access) return undefined;

    let subjectId: string | undefined;
    try {
      subjectId = resolveSubjectId(req);
    } catch {
      return undefined;
    }

    return {
      token: bearerToken ?? "",
      clientId: user.id,
      scopes: ["openid"],
      extra: {
        user,
        subjectId,
        projectId: access.project.id,
        orgSlug: access.org.slug,
        projectSlug: access.project.slug,
      },
    };
  };
}

/** Legacy embedder path: project UUID via X-SSOTA-Project-Id header (no URL slug). */
async function verifyLegacyProjectToken(
  req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> {
  const user = await verifyBearerToken(
    bearerToken ? `Bearer ${bearerToken}` : null,
  );
  if (!user) return undefined;

  const projectId = resolveProjectId(req);
  if (!projectId) return undefined;

  let subjectId: string | undefined;
  try {
    subjectId = resolveSubjectId(req);
  } catch {
    return undefined;
  }

  return {
    token: bearerToken ?? "",
    clientId: user.id,
    scopes: ["openid"],
    extra: { user, subjectId, projectId },
  };
}

export const accountAuthHandler = withMcpAuth(
  accountMcpHandler,
  verifyAccountToken,
  {
    required: true,
    resourceMetadataPath: "/.well-known/oauth-protected-resource",
    resourceUrl: mcpPublicOrigin(),
  },
);

export function createProjectAuthHandler(orgSlug: string, projectSlug: string) {
  return withMcpAuth(
    projectMcpHandler,
    createVerifyProjectToken(orgSlug, projectSlug),
    {
      required: true,
      resourceMetadataPath: `/.well-known/oauth-protected-resource?org=${encodeURIComponent(orgSlug)}&project=${encodeURIComponent(projectSlug)}`,
      resourceUrl: mcpPublicOrigin(),
    },
  );
}

/** @deprecated Prefer URL-scoped /api/mcp/{orgSlug}/{projectSlug}. Kept for embedder BFF header auth. */
export const legacyProjectAuthHandler = withMcpAuth(
  projectMcpHandler,
  verifyLegacyProjectToken,
  {
    required: true,
    resourceMetadataPath: "/.well-known/oauth-protected-resource",
    resourceUrl: mcpPublicOrigin(),
  },
);

export { buildMcpResourceUrl };
