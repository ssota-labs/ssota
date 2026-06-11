import { protectedResourceHandler } from "mcp-handler";
import { supabaseAuthIssuerUrl } from "@/lib/auth";
import { buildMcpResourceUrl, mcpPublicOrigin } from "@/lib/mcp/resource-url";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const orgSlug = url.searchParams.get("org")?.trim();
  const projectSlug = url.searchParams.get("project")?.trim();
  const origin = mcpPublicOrigin();

  const resourceUrl =
    orgSlug && projectSlug
      ? buildMcpResourceUrl({ origin, orgSlug, projectSlug })
      : (process.env.MCP_RESOURCE_URL ?? buildMcpResourceUrl({ origin }));

  const handler = protectedResourceHandler({
    authServerUrls: [supabaseAuthIssuerUrl()],
    resourceUrl,
  });

  return handler(req);
}
