import { protectedResourceHandler } from "mcp-handler";
import { authServerUrls } from "@/lib/auth";
import { buildMcpResourceUrl, mcpPublicOrigin } from "@/lib/mcp/resource-url";

/**
 * RFC 9728 Protected Resource Metadata 핸들러.
 *
 * 루트(`/.well-known/oauth-protected-resource`)와 경로-suffixed
 * (`/.well-known/oauth-protected-resource/api/mcp`) 양쪽에서 동일하게 쓴다.
 * Claude 등 최신 MCP 클라이언트는 리소스 경로를 끼워넣은 suffixed 위치를
 * 직접 구성해 조회하므로, 루트만 서빙하면 디스커버리에 실패한다.
 */
export async function handleProtectedResource(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const orgSlug = url.searchParams.get("org")?.trim();
  const projectSlug = url.searchParams.get("project")?.trim();
  const origin = mcpPublicOrigin();

  const resourceUrl =
    orgSlug && projectSlug
      ? buildMcpResourceUrl({ origin, orgSlug, projectSlug })
      : (process.env.MCP_RESOURCE_URL ?? buildMcpResourceUrl({ origin }));

  const handler = protectedResourceHandler({
    authServerUrls: await authServerUrls(),
    resourceUrl,
  });

  return handler(req);
}
