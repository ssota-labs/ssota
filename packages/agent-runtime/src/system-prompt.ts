import { getWorkflowByKey } from "@ssota/contracts/workflows";
import type { Task } from "@ssota/contracts";

export const FALLBACK_INSTRUCTIONS = `You are the SSOTA agent. You operate on a project's knowledge graph (nodes/edges), tasks, and workflows through the provided tools. Read context before acting, make the smallest correct change, and finish by recording the task outcome.`;

/**
 * Workflow instructions resolved upstream (in `run.ts`) from the per-project
 * `workflows` table, with embedded-registry fallback. When omitted,
 * `buildSystemPrompt` resolves from the embedded registry directly — this keeps
 * the function sync and pure for tests/callers that don't have a workflow port.
 */
export interface ResolvedWorkflowInstructions {
  /** `agent.main` (main router) instruction. */
  base: string;
  /** The task's workflowKey instruction, or null if none. */
  workflowInstruction: string | null;
}

/**
 * Build the run instructions. The base body reuses the `agent.main` workflow
 * instruction (the main router). Instructions are sourced from the per-project
 * `workflows` table when `resolved` is provided (DB-persisted, tenant-editable),
 * otherwise from the embedded registry (single source of truth, authored in
 * `packages/contracts/.../instructions/agent.main.md`).
 */
export function buildSystemPrompt(params: {
  task: Pick<
    Task,
    "id" | "title" | "workflowKey" | "acceptanceCriteria" | "targetNodeId"
  >;
  projectId: string;
  accountId?: string;
  resolved?: ResolvedWorkflowInstructions;
}): string {
  const { task, projectId, accountId, resolved } = params;
  const base =
    resolved?.base ??
    getWorkflowByKey("agent.main")?.instruction ??
    FALLBACK_INSTRUCTIONS;

  const workflowInstruction = resolved
    ? resolved.workflowInstruction
    : (getWorkflowByKey(task.workflowKey)?.instruction ?? null);

  const acceptance =
    task.acceptanceCriteria.length > 0
      ? `\nAcceptance criteria:\n${task.acceptanceCriteria
          .map((c, i) => `  ${i + 1}. ${typeof c === "string" ? c : JSON.stringify(c)}`)
          .join("\n")}`
      : "";

  return [
    base,
    `\n## Current run`,
    `- projectId: ${projectId}`,
    accountId ? `- accountId: ${accountId}` : `- accountId: (shared / builder scope)`,
    `- taskId: ${task.id}`,
    `- task: ${task.title}`,
    `- workflowKey: ${task.workflowKey}`,
    task.targetNodeId ? `- targetNodeId: ${task.targetNodeId}` : null,
    acceptance,
    workflowInstruction
      ? `\n## Workflow instruction (${task.workflowKey})\n${workflowInstruction}`
      : null,
    `\n## Finishing`,
    `When the task is complete, call \`complete_task\` with a short summary and any result payload. Before a risky or irreversible action that needs human sign-off, call \`request_approval\` with the reason (this pauses the task for approval). If you are blocked by missing input, call \`block_task\` with the reason. Do not stop without calling one of these.`,
  ]
    .filter((line) => line !== null)
    .join("\n");
}
