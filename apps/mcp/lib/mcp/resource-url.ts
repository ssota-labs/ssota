/** OAuth protected resource identifier (RFC 9728) for SSOTA MCP endpoints. */
export function buildMcpResourceUrl(input: {
  origin: string;
  orgSlug?: string;
  projectSlug?: string;
}): string {
  const origin = input.origin.replace(/\/$/, "");
  if (input.orgSlug && input.projectSlug) {
    return `${origin}/api/mcp/${encodeURIComponent(input.orgSlug)}/${encodeURIComponent(input.projectSlug)}`;
  }
  return `${origin}/api/mcp`;
}

export function mcpPublicOrigin(): string {
  return new URL(
    process.env.MCP_RESOURCE_URL ?? "http://127.0.0.1:3001/api/mcp",
  ).origin;
}
