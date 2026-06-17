import { z } from "zod";
import {
  getWorkflowForMcp,
  getWorkflowInstructionForMcp,
  listWorkflowsForMcp,
} from "@/lib/api/workflow-services";
import { throwUnknownWorkflowKey } from "@/lib/api/mcp-errors";
import { jsonContent } from "@/lib/mcp/json-content";
import { registerScopedProjectTool } from "@/lib/mcp/register-scoped-tool";
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

export function registerWorkflowTools(server: McpToolServer) {
  registerScopedProjectTool(
    server,
    "list_workflows",
    {
      title: "List Workflows",
      description:
        "List development workflow definitions from the deployed registry (metadata only, no instruction body).",
      inputSchema: {},
    },
    async () => jsonContent(listWorkflowsForMcp()),
  );

  registerScopedProjectTool(
    server,
    "get_workflow",
    {
      title: "Get Workflow",
      description:
        "Fetch workflow metadata by workflowKey (title, category, cadence, defaults). Use get_workflow_instruction for the full markdown body.",
      inputSchema: { workflowKey: z.string().min(1) },
    },
    async ({ args }) => {
      const workflowKey = String(args.workflowKey);
      const workflow = getWorkflowForMcp(workflowKey);
      if (!workflow) {
        throwUnknownWorkflowKey(workflowKey);
      }
      return jsonContent(workflow);
    },
  );

  registerScopedProjectTool(
    server,
    "get_workflow_instruction",
    {
      title: "Get Workflow Instruction",
      description:
        "Fetch the full markdown instruction for a workflowKey. Load agent.main at session start, then fetch per-task workflows on demand.",
      inputSchema: { workflowKey: z.string().min(1) },
    },
    async ({ args }) => {
      const workflowKey = String(args.workflowKey);
      const instruction = getWorkflowInstructionForMcp(workflowKey);
      if (!instruction) {
        throwUnknownWorkflowKey(workflowKey);
      }
      return jsonContent(instruction);
    },
  );
}
