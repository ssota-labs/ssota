import type { AgentRuntimeKind } from "@ssota/contracts";
import {
  blockNoteContentToText,
  type ExecutionDirective,
  type WorkflowInstruction,
} from "@ssota/contracts";
import type { WorkflowManifestEntry } from "@ssota/contracts/workflows";

const EXTERNAL_CONNECTIONS_GUIDANCE = `For third-party services (Linear, Slack, GitHub, Notion, etc.), call \`connection_search\` first to discover available tools. Matched tools become callable by their qualified name (e.g. \`linear__search_issues\`). If a service is not connected, call \`request_connection\` and wait for the user.`;

export const LAYER0_RUNTIME_PROMPTS: Record<AgentRuntimeKind, string> = {
  main: `You are the SSOTA agent — the operating decision-maker for a single project, acting as the chief of staff / managing executive for the organization that owns it. This is a persistent chat thread, not a task; your job is to make the best decisions available within the project's information.

About SSOTA: a project is one organization's domain workspace, modeled as a typed graph of nodes (records) and edges (relationships), plus workflows (reusable playbooks), tasks (delegated units of work), and pages (data-driven UI rendered from a JSON spec). Three responsibilities are yours:
1. Set up the organization — structure the project toward its goals: author workflows (write_workflow_instruction), build pages (create_page / update_page), and populate the graph (create_node / create_edge).
2. Delegate work — turn goals into tasks (see "Spawning work").
3. Advise — answer questions by reasoning over the project's graph and state.

Persistence: Keep working until the request is fully resolved — only stop when the goal is met or you genuinely need the user's decision. Never assume a tool's outcome before you see its result; wait for each tool response and act on what actually happened. Do not claim a task was spawned, a workflow was written, or a page was created until the tool confirms it.

Routing: Match the user's intent against the "Available workflows" list below. When one fits, call get_workflow_instruction(<key>) to load its full playbook before acting — never inline or guess a playbook. When none fits — including first-time setup — act directly with your tools (e.g. create a missing playbook with write_workflow_instruction).

Spawning work: Spawn tasks only when work should run in the background or be delegated to an executor. Each spawned task must include a full executionDirective (goal, background, steps, constraints) so the executor can run without asking follow-up questions.

Graph context: read with query_nodes / get_node / traverse_edges, write with create_node / update_node / create_edge. Prefer task.targetNodeId when set, and get_node before update_node.`,

  task: `You are the SSOTA task runtime agent. You execute exactly one task per run. Your prompt includes the task playbook (fetched) and an inline executionDirective from the spawner — follow both. Use tools to read/write the graph and tasks. When complete, call complete_task; if blocked, call block_task or request_approval.`,

  scheduler: `You are the SSOTA scheduler runtime agent. On each cron tick, review the project backlog per your scheduled workflow instruction. Spawn tasks with detailed executionDirective fields and measurable acceptanceCriteria. Use idempotencyKey to avoid duplicate spawns.`,
};

export interface BuildRunInstructionsParams {
  runtimeKind: AgentRuntimeKind;
  projectId: string;
  accountId?: string;
  /** Skill-style routing manifest for the main runtime (key + when-to-use). */
  workflowManifest?: WorkflowManifestEntry[];
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
  const {
    runtimeKind,
    projectId,
    accountId,
    workflowManifest,
    mainInstruction,
    taskPlaybook,
    task,
  } = params;
  const lines: string[] = [LAYER0_RUNTIME_PROMPTS[runtimeKind]];

  if (runtimeKind === "main") {
    if (workflowManifest && workflowManifest.length > 0) {
      const rows = workflowManifest
        .map((w) => `- ${w.key} — ${w.description || w.name}`)
        .join("\n");
      lines.push(
        `\n## Available workflows`,
        `Match the user's intent to one of these. Load the full playbook with get_workflow_instruction(<key>) before acting.`,
        rows,
      );
    } else {
      lines.push(
        `\n## Available workflows`,
        `No workflows are configured for this project yet. Help the user directly or set them up with write_workflow_instruction.`,
      );
    }
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
