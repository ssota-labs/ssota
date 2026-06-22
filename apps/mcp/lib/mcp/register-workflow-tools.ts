import { z } from "zod";
import { ExecutionDirectiveSchema } from "@ssota/contracts";
import {
  getWorkflowForMcp,
  getWorkflowInstructionForMcp,
  listWorkflowsForMcp,
} from "@/lib/api/workflow-services";
import { throwUnknownWorkflowKey } from "@/lib/api/mcp-errors";
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

export function registerWorkflowTools(server: McpToolServer) {
  registerScopedProjectTool(
    server,
    "list_workflows",
    {
      title: "List Workflows",
      description:
        "List workflow instruction definitions for this project (metadata only).",
      inputSchema: {},
    },
    async ({ projectId }) =>
      jsonContent(await listWorkflowsForMcp(getDb(), projectId)),
  );

  registerScopedProjectTool(
    server,
    "get_workflow",
    {
      title: "Get Workflow",
      description:
        "Fetch workflow instruction metadata by key. Use get_workflow_instruction for the full body.",
      inputSchema: { workflowKey: z.string().min(1) },
    },
    async ({ args, projectId }) => {
      const workflowKey = String(args.workflowKey);
      const workflow = await getWorkflowForMcp(getDb(), projectId, workflowKey);
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
        "Fetch the full instruction text for a workflow key from the project DB.",
      inputSchema: { workflowKey: z.string().min(1) },
    },
    async ({ args, projectId }) => {
      const workflowKey = String(args.workflowKey);
      const instruction = await getWorkflowInstructionForMcp(
        getDb(),
        projectId,
        workflowKey,
      );
      if (!instruction) {
        throwUnknownWorkflowKey(workflowKey);
      }
      return jsonContent(instruction);
    },
  );
}
