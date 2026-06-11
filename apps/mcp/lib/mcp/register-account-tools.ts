import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { z } from "zod";
import {
  getProjectForUser,
  listOrganizationsForUser,
  listProjectsForUser,
} from "@/lib/mcp/account-services";
import { jsonContent } from "@/lib/mcp/json-content";

type McpToolServer = {
  registerTool: (
    name: string,
    config: Record<string, unknown>,
    // mcp-handler tool callback — typed loosely to match createMcpHandler server
    handler: (args: Record<string, unknown>, extra: { authInfo?: AuthInfo }) => Promise<unknown>,
  ) => void;
};

function requireUserFromExtra(
  extra: { authInfo?: AuthInfo } | undefined,
): { id: string } {
  const user = extra?.authInfo?.extra?.user as { id: string } | undefined;
  if (!user?.id) {
    throw new Error("Unauthorized");
  }
  return user;
}

export function registerAccountTools(server: McpToolServer) {
  server.registerTool(
    "list_organizations",
    {
      title: "List Organizations",
      description:
        "Discover: organizations the authenticated user can access. Use list_projects to find MCP project URLs.",
      inputSchema: {},
    },
    async (_args, extra) => {
      const user = requireUserFromExtra(extra);
      return jsonContent(await listOrganizationsForUser(user.id));
    },
  );

  server.registerTool(
    "list_projects",
    {
      title: "List Projects",
      description:
        "Discover: accessible projects with MCP URLs (/api/mcp/{orgSlug}/{projectSlug}). Optional org filter.",
      inputSchema: {
        orgSlug: z.string().min(1).optional(),
      },
    },
    async (args, extra) => {
      const user = requireUserFromExtra(extra);
      const orgSlug =
        typeof args.orgSlug === "string" ? args.orgSlug : undefined;
      return jsonContent(await listProjectsForUser(user.id, orgSlug));
    },
  );

  server.registerTool(
    "get_project",
    {
      title: "Get Project",
      description:
        "Fetch one accessible project by orgSlug + projectSlug, including its MCP URL.",
      inputSchema: {
        orgSlug: z.string().min(1),
        projectSlug: z.string().min(1),
      },
    },
    async (args, extra) => {
      const user = requireUserFromExtra(extra);
      const orgSlug = String(args.orgSlug);
      const projectSlug = String(args.projectSlug);
      const project = await getProjectForUser(
        user.id,
        orgSlug,
        projectSlug,
      );
      if (!project) {
        return {
          content: [{ type: "text", text: "Project not found or access denied" }],
          isError: true,
        };
      }
      return jsonContent(project);
    },
  );
}
