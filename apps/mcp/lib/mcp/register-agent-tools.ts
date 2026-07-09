import { z } from "zod";
import { AgentTriggerSchema, ToolBundleSchema } from "@ssota/contracts";
import {
  createAgentDefinitionForMcp,
  getAgentForMcp,
  getAgentInstructionForMcp,
  listAgentsForMcp,
} from "@/lib/api/agent-services";
import {
  throwMcpToolError,
  throwUnknownAgentDefinitionId,
} from "@/lib/api/mcp-errors";
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

  registerScopedProjectTool(
    server,
    "create_agent",
    {
      title: "Create Agent",
      description:
        "Create or update (upsert by id) an agent definition — the environment's recurring workers. Write the playbook as markdown in `body`; `description` is a skill-style 'when to use' line (routing depends on it). Set `toolBundles` (capabilities) and `allowedTriggers` so the agent can run (e.g. `task`/`schedule`/`heartbeat` for automated work, `chat` for conversational). An 'orchestrator' is just an agent with `tasks.manage` + `delegate` whose playbook spawns tasks to other agents (pass their ids as `linkedWorkerAgentIds`).",
      inputSchema: {
        id: z.string().uuid().optional(),
        name: z.string().min(1),
        description: z.string(),
        body: z.string().min(1),
        toolBundles: z.array(ToolBundleSchema).optional(),
        allowedTriggers: z.array(AgentTriggerSchema).optional(),
        model: z.string().optional(),
        maxSteps: z.number().int().positive().optional(),
        linkedWorkerAgentIds: z.array(z.string().uuid()).optional(),
      },
    },
    async ({ teamspaceId, args }) => {
      try {
        return jsonContent(
          await createAgentDefinitionForMcp(getDb(), teamspaceId, args),
        );
      } catch (error) {
        throwMcpToolError(error);
      }
    },
  );
}

/** @deprecated Use registerAgentTools */
export const registerWorkflowTools = registerAgentTools;
