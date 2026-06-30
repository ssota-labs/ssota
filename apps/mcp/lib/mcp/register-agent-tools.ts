import { z } from "zod";
import {
  getAgentForMcp,
  getAgentInstructionForMcp,
  listAgentsForMcp,
} from "@/lib/api/agent-services";
import { throwUnknownAgentDefinitionId } from "@/lib/api/mcp-errors";
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
        "Fetch agent definition metadata by id. Use get_agent_instruction for the full body.",
      inputSchema: { agentDefinitionId: z.string().uuid() },
    },
    async ({ args, teamspaceId }) => {
      const agentDefinitionId = String(args.agentDefinitionId);
      const agent = await getAgentForMcp(
        getDb(),
        teamspaceId,
        agentDefinitionId,
      );
      if (!agent) {
        throwUnknownAgentDefinitionId(agentDefinitionId);
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
        "Fetch the full instruction text for an agent definition id from the project DB.",
      inputSchema: { agentDefinitionId: z.string().uuid() },
    },
    async ({ args, teamspaceId }) => {
      const agentDefinitionId = String(args.agentDefinitionId);
      const instruction = await getAgentInstructionForMcp(
        getDb(),
        teamspaceId,
        agentDefinitionId,
      );
      if (!instruction) {
        throwUnknownAgentDefinitionId(agentDefinitionId);
      }
      return jsonContent(instruction);
    },
  );
}

/** @deprecated Use registerAgentTools */
export const registerWorkflowTools = registerAgentTools;
