import { getWorkflowByKey } from "@ssota/contracts/workflows";
import type { Task } from "@ssota/contracts";

const FALLBACK_INSTRUCTIONS = `You are the SSOTA agent. You operate on a project's knowledge graph (nodes/edges), tasks, and workflows through the provided tools. Read context before acting, make the smallest correct change, and finish by recording the task outcome.`;

/**
 * Build the run instructions. The base body reuses the embedded `agent.main`
 * workflow instruction (single source of truth, authored in
 * `packages/contracts/.../instructions/agent.main.md`) rather than restating it.
 */
export function buildSystemPrompt(params: {
  task: Pick<
    Task,
    "id" | "title" | "workflowKey" | "acceptanceCriteria" | "targetNodeId"
  >;
  projectId: string;
  accountId?: string;
}): string {
  const { task, projectId, accountId } = params;
  const base = getWorkflowByKey("agent.main")?.instruction ?? FALLBACK_INSTRUCTIONS;

  const workflowInstruction = getWorkflowByKey(task.workflowKey)?.instruction;

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
