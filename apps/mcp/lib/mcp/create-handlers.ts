import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { verifyBearerToken } from "@/lib/auth";
import { resolveProjectAccess } from "@/lib/mcp/project-access";
import { registerAccountTools } from "@/lib/mcp/register-account-tools";
import { registerProjectTools } from "@/lib/mcp/register-project-tools";
import { parseMcpProjectScope } from "@/lib/mcp/resource-url";
import { resolveProjectId } from "@/lib/project-context";
import { resolveSubjectId } from "@/lib/subject-context";
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

/** Embedder BFF: project UUID via X-SSOTA-Project-Id header. */
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
    resourceMetadataPath: mcpResourceMetadataPath(),
    resourceUrl: mcpPublicOrigin(),
  },
);

export function createProjectAuthHandler(orgSlug: string, projectSlug: string) {
  return withMcpAuth(
    projectMcpHandler,
    createVerifyProjectToken(orgSlug, projectSlug),
    {
      required: true,
      resourceMetadataPath: mcpResourceMetadataPath(orgSlug, projectSlug),
      resourceUrl: mcpPublicOrigin(),
    },
  );
}

export const legacyProjectAuthHandler = withMcpAuth(
  projectMcpHandler,
  verifyLegacyProjectToken,
  {
    required: true,
    resourceMetadataPath: mcpResourceMetadataPath(),
    resourceUrl: mcpPublicOrigin(),
  },
);

const projectHandlerCache = new Map<
  string,
  (req: Request) => Promise<Response>
>();

function projectHandlerKey(orgSlug: string, projectSlug: string): string {
  return `${orgSlug}/${projectSlug}`;
}

function getProjectAuthHandler(orgSlug: string, projectSlug: string) {
  const key = projectHandlerKey(orgSlug, projectSlug);
  let handler = projectHandlerCache.get(key);
  if (!handler) {
    handler = createProjectAuthHandler(orgSlug, projectSlug);
    projectHandlerCache.set(key, handler);
  }
  return handler;
}

/** Single MCP URL — account tools without query; project tools with ?org=&project=. */
export async function dispatchMcpRequest(req: Request): Promise<Response> {
  try {
    const scope = parseMcpProjectScope(req);
    if (scope) {
      return getProjectAuthHandler(scope.orgSlug, scope.projectSlug)(req);
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid MCP project scope";
    return Response.json({ error: message }, { status: 400 });
  }

  if (resolveProjectId(req)) {
    return legacyProjectAuthHandler(req);
  }

  return accountAuthHandler(req);
}

export { buildMcpResourceUrl };
