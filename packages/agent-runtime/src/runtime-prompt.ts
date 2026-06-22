import type { AgentRuntimeKind } from "@ssota/contracts";
import {
  blockNoteContentToText,
  type ExecutionDirective,
  type WorkflowInstruction,
} from "@ssota/contracts";

const EXTERNAL_CONNECTIONS_GUIDANCE = `For third-party services (Linear, Slack, GitHub, Notion, etc.), call \`connection_search\` first to discover available tools. Matched tools become callable by their qualified name (e.g. \`linear__search_issues\`). If a service is not connected, call \`request_connection\` and wait for the user.`;

export const LAYER0_RUNTIME_PROMPTS: Record<AgentRuntimeKind, string> = {
  main: `You are the SSOTA main runtime agent. You operate in a persistent chat thread — this conversation is NOT a task. Route user intent using your main workflow instruction. Spawn tasks only when delegated work is needed; each spawned task must include a full executionDirective (goal, background, steps, constraints) so the task executor can run without asking follow-up questions. Fetch sub-workflow playbooks on demand via get_workflow_instruction — never inline large playbooks.`,

  task: `You are the SSOTA task runtime agent. You execute exactly one task per run. Your prompt includes the task playbook (fetched) and an inline executionDirective from the spawner — follow both. Use tools to read/write the graph and tasks. When complete, call complete_task; if blocked, call block_task or request_approval.`,

  scheduler: `You are the SSOTA scheduler runtime agent. On each cron tick, review the project backlog per your scheduled workflow instruction. Spawn tasks with detailed executionDirective fields and measurable acceptanceCriteria. Use idempotencyKey to avoid duplicate spawns.`,
};

export interface BuildRunInstructionsParams {
  runtimeKind: AgentRuntimeKind;
  projectId: string;
  accountId?: string;
  mainInstruction?: WorkflowInstruction | null;
  taskPlaybook?: WorkflowInstruction | null;
  task?: {
    id: string;
    title: string;
    acceptanceCriteria: unknown[];
    targetNodeId?: string | null;
    executionDirective?: ExecutionDirective | null;
  };
}

export function buildRunInstructions(params: BuildRunInstructionsParams): string {
  const { runtimeKind, projectId, accountId, mainInstruction, taskPlaybook, task } =
    params;
  const lines: string[] = [LAYER0_RUNTIME_PROMPTS[runtimeKind]];

  if (runtimeKind === "main" && mainInstruction) {
    lines.push(
      `\n## Main workflow (${mainInstruction.key})\n${blockNoteContentToText(mainInstruction.content)}`,
    );
  }

  if (runtimeKind === "task" && task) {
    lines.push(
      `\n## Current task`,
      `- projectId: ${projectId}`,
      accountId
        ? `- accountId: ${accountId}`
        : `- accountId: (shared / builder scope)`,
      `- taskId: ${task.id}`,
      `- title: ${task.title}`,
      task.targetNodeId ? `- targetNodeId: ${task.targetNodeId}` : "",
    );
    if (task.acceptanceCriteria.length > 0) {
      lines.push(
        `\n## Acceptance criteria`,
        ...task.acceptanceCriteria.map(
          (c, i) =>
            `  ${i + 1}. ${typeof c === "string" ? c : JSON.stringify(c)}`,
        ),
      );
    }
    if (task.executionDirective) {
      const d = task.executionDirective;
      lines.push(
        `\n## Execution directive (from spawner)`,
        `Goal: ${d.goal}`,
        `Background: ${d.background}`,
        `Steps:\n${d.steps.map((s, i) => `  ${i + 1}. ${s}`).join("\n")}`,
        d.constraints.length
          ? `Constraints:\n${d.constraints.map((c) => `  - ${c}`).join("\n")}`
          : "",
        d.notes ? `Notes: ${d.notes}` : "",
      );
    }
    if (taskPlaybook) {
      lines.push(
        `\n## Workflow playbook (${taskPlaybook.key})`,
        blockNoteContentToText(taskPlaybook.content),
      );
    }
    lines.push(
      `\n## Finishing`,
      `When done, call complete_task. If blocked, call block_task or request_approval.`,
    );
  }

  if (runtimeKind === "scheduler" && mainInstruction) {
    lines.push(
      `\n## Scheduler instruction (${mainInstruction.key})\n${blockNoteContentToText(mainInstruction.content)}`,
    );
  }

  if (runtimeKind === "main" || runtimeKind === "task") {
    lines.push(`\n## External connections (MCP)`, EXTERNAL_CONNECTIONS_GUIDANCE);
  }

  return lines.filter(Boolean).join("\n");
}
