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
        "Discover: organizations the authenticated user can access. Use list_projects, then pass orgSlug + teamspaceSlug to project tools.",
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
        "Discover: accessible projects. Pass returned orgSlug + teamspaceSlug on every project-scoped tool call.",
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
      title: "Get Teamspace",
      description:
        "Fetch one accessible project by orgSlug + teamspaceSlug for use in project tool params.",
      inputSchema: {
        orgSlug: z.string().min(1),
        teamspaceSlug: z.string().min(1),
      },
    },
    async (args, extra) => {
      const user = requireUserFromExtra(extra);
      const orgSlug = String(args.orgSlug);
      const teamspaceSlug = String(args.teamspaceSlug);
      const project = await getProjectForUser(
        user.id,
        orgSlug,
        teamspaceSlug,
      );
      if (!project) {
        return {
          content: [{ type: "text", text: "Teamspace not found or access denied" }],
          isError: true,
        };
      }
      return jsonContent(project);
    },
  );
}
