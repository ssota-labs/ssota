const MCP_PATH = "/api/mcp";

export type McpProjectScope = {
  orgSlug: string;
  teamspaceSlug: string;
};

/** Teamspace scope from `?org=&project=` on the single MCP URL. */
export function parseMcpProjectScope(request: Request): McpProjectScope | null {
  const url = new URL(request.url);
  const orgSlug = url.searchParams.get("org")?.trim();
  const teamspaceSlug = url.searchParams.get("project")?.trim();

  if (!orgSlug && !teamspaceSlug) return null;
  if (!orgSlug || !teamspaceSlug) {
    throw new Error("Both org and project query params are required for project MCP");
  }

  return { orgSlug, teamspaceSlug };
}

/** OAuth protected resource identifier (RFC 9728) — always `/api/mcp` with optional query. */
export function buildMcpResourceUrl(input: {
  origin: string;
  orgSlug?: string;
  teamspaceSlug?: string;
}): string {
  const origin = input.origin.replace(/\/$/, "");
  const base = `${origin}${MCP_PATH}`;
  if (input.orgSlug && input.teamspaceSlug) {
    const params = new URLSearchParams({
      org: input.orgSlug,
      project: input.teamspaceSlug,
    });
    return `${base}?${params.toString()}`;
  }
  return base;
}

export function mcpPublicOrigin(): string {
  return new URL(
    process.env.MCP_RESOURCE_URL ?? "http://127.0.0.1:3001/api/mcp",
  ).origin;
}

export function mcpResourceMetadataPath(orgSlug?: string, teamspaceSlug?: string): string {
  if (orgSlug && teamspaceSlug) {
    const params = new URLSearchParams({ org: orgSlug, project: teamspaceSlug });
    return `/.well-known/oauth-protected-resource?${params.toString()}`;
  }
  return "/.well-known/oauth-protected-resource";
}
