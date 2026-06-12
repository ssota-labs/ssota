const MCP_PATH = "/api/mcp";

export type McpProjectScope = {
  orgSlug: string;
  projectSlug: string;
};

/** Project scope from `?org=&project=` on the single MCP URL. */
export function parseMcpProjectScope(request: Request): McpProjectScope | null {
  const url = new URL(request.url);
  const orgSlug = url.searchParams.get("org")?.trim();
  const projectSlug = url.searchParams.get("project")?.trim();

  if (!orgSlug && !projectSlug) return null;
  if (!orgSlug || !projectSlug) {
    throw new Error("Both org and project query params are required for project MCP");
  }

  return { orgSlug, projectSlug };
}

/** OAuth protected resource identifier (RFC 9728) — always `/api/mcp` with optional query. */
export function buildMcpResourceUrl(input: {
  origin: string;
  orgSlug?: string;
  projectSlug?: string;
}): string {
  const origin = input.origin.replace(/\/$/, "");
  const base = `${origin}${MCP_PATH}`;
  if (input.orgSlug && input.projectSlug) {
    const params = new URLSearchParams({
      org: input.orgSlug,
      project: input.projectSlug,
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

export function mcpResourceMetadataPath(orgSlug?: string, projectSlug?: string): string {
  if (orgSlug && projectSlug) {
    const params = new URLSearchParams({ org: orgSlug, project: projectSlug });
    return `/.well-known/oauth-protected-resource?${params.toString()}`;
  }
  return "/.well-known/oauth-protected-resource";
}
