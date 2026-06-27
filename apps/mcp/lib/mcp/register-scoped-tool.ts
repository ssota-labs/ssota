import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import {
  mcpProjectScopeFields,
  resolveProjectIdForTool,
  stripProjectScope,
} from "@/lib/mcp/project-scope";

type McpToolServer = {
  registerTool: (
    name: string,
    config: Record<string, unknown>,
    handler: (
      args: Record<string, unknown>,
      extra: { authInfo?: AuthInfo },
    ) => Promise<unknown>,
  ) => void;
};

type ScopedToolContext = {
  teamspaceId: string;
  args: Record<string, unknown>;
  extra: { authInfo?: AuthInfo };
};

export function registerScopedProjectTool(
  server: McpToolServer,
  name: string,
  config: {
    title: string;
    description: string;
    inputSchema?: Record<string, unknown>;
  },
  handler: (ctx: ScopedToolContext) => Promise<unknown>,
): void {
  server.registerTool(
    name,
    {
      ...config,
      inputSchema: {
        ...mcpProjectScopeFields,
        ...(config.inputSchema ?? {}),
      },
    },
    async (args, extra) => {
      const teamspaceId = await resolveProjectIdForTool(args, extra);
      return handler({
        teamspaceId,
        args: stripProjectScope(args),
        extra,
      });
    },
  );
}
