import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { readWorkflowByKey, listWorkflows } from "@ssota/core";
import {
  WorkflowInstructionDefinitionSchema,
  type WorkflowInstructionDefinition,
} from "@ssota/contracts/workflows";
import { getWorkflowPort } from "../ports.js";
import { getRunContext } from "./context.js";

/**
 * Tools for the agent to author and own workflow definitions. Workflows are a
 * core, per-project concept stored in the `workflows` table (peer of the
 * node/edge catalog), so the main orchestration instruction (`agent.main`) and
 * every sub-workflow are tenant-editable and agent-authorable here — not baked
 * into the system prompt.
 */
export function createWorkflowTools(): ToolSet {
  return {
    write_workflow: tool({
      description:
        "Create or update a workflow definition (upsert by workflowKey) in this project's workflows table. Use this to edit the main orchestration/router instruction (workflowKey 'agent.main') or any sub-workflow. Fields: { workflowKey, title, category: 'orchestrator'|'recurring'|'work'|'initiative', cadenceHint?: 'daily'|'weekly'|'monthly'|'on_demand', defaultExecutorType?: 'Agent'|'Human'|'System', defaultStatus?, instruction (markdown body the agent reads when running this workflow) }. Workflow order is NOT fixed in code — the agent resolves it by reading agent.main + each workflow's instruction at run time.",
      inputSchema: z.object({
        definition: z
          .record(z.unknown())
          .describe("A WorkflowInstructionDefinition object."),
      }),
      execute: async (input, { experimental_context }) => {
        const ctx = getRunContext(experimental_context);
        try {
          const parsed = WorkflowInstructionDefinitionSchema.parse(
            input.definition,
          ) as WorkflowInstructionDefinition;
          const saved = await getWorkflowPort(
            ctx.projectId,
            ctx.accountId,
          ).upsertWorkflow(parsed);
          return { ok: true, workflow: saved };
        } catch (error) {
          return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    }),

    read_workflow: tool({
      description:
        "Read a workflow definition by workflowKey. Returns the per-project DB row when present, else the embedded default ('registry'). Includes a `source` field.",
      inputSchema: z.object({
        workflowKey: z.string().describe("e.g. 'agent.main', 'work.implement_feature'."),
      }),
      execute: async (input, { experimental_context }) => {
        const ctx = getRunContext(experimental_context);
        const result = await readWorkflowByKey(
          getWorkflowPort(ctx.projectId, ctx.accountId),
          input.workflowKey,
        );
        return result ?? { found: false };
      },
    }),

    list_workflows: tool({
      description:
        "List all workflow definitions for this project (DB rows take precedence; embedded defaults fill any missing keys). Each item has { definition, source }.",
      inputSchema: z.object({}),
      execute: async (_input, { experimental_context }) => {
        const ctx = getRunContext(experimental_context);
        const items = await listWorkflows(
          getWorkflowPort(ctx.projectId, ctx.accountId),
        );
        return { workflows: items };
      },
    }),
  };
}
