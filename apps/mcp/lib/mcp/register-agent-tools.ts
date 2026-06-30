import { z } from "zod";
import { ExecutionDirectiveSchema } from "@ssota/contracts";
import {
  getAgentForMcp,
  getAgentInstructionForMcp,
  listAgentsForMcp,
} from "@/lib/api/agent-services";
import { throwUnknownAgentKey } from "@/lib/api/mcp-errors";
import { jsonContent } from "@/lib/mcp/json-content";
import { registerScopedProjectTool } from "@/lib/mcp/register-scoped-tool";
import { getDb } from "@/lib/ports";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

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

export function registerAgentTools(server: McpToolServer) {
  registerScopedProjectTool(
    server,
    "list_agents",
    {
      title: "List Agents",
      description:
        "List agent definitions for this project (metadata only).",
      inputSchema: {},
    },
    async ({ teamspaceId }) =>
      jsonContent(await listAgentsForMcp(getDb(), teamspaceId)),
  );

  registerScopedProjectTool(
    server,
    "get_agent",
    {
      title: "Get Agent",
      description:
        "Fetch agent definition metadata by key. Use get_agent_instruction for the full body.",
      inputSchema: { agentKey: z.string().min(1) },
    },
    async ({ args, teamspaceId }) => {
      const agentKey = String(args.agentKey);
      const agent = await getAgentForMcp(getDb(), teamspaceId, agentKey);
      if (!agent) {
        throwUnknownAgentKey(agentKey);
      }
      return jsonContent(agent);
    },
  );

  registerScopedProjectTool(
    server,
    "get_agent_instruction",
    {
      title: "Get Agent Instruction",
      description:
        "Fetch the full instruction text for an agent key from the project DB.",
      inputSchema: { agentKey: z.string().min(1) },
    },
    async ({ args, teamspaceId }) => {
      const agentKey = String(args.agentKey);
      const instruction = await getAgentInstructionForMcp(
        getDb(),
        teamspaceId,
        agentKey,
      );
      if (!instruction) {
        throwUnknownAgentKey(agentKey);
      }
      return jsonContent(instruction);
    },
  );
}

/** @deprecated Use registerAgentTools */
export const registerWorkflowTools = registerAgentTools;
