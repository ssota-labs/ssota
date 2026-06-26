import type { AgentRuntimeKind } from "@ssota/contracts";
import {
  blockNoteContentToText,
  type ExecutionDirective,
  type WorkflowInstruction,
} from "@ssota/contracts";
import type { WorkflowManifestEntry } from "@ssota/contracts/workflows";
import type { SystemModelMessage } from "ai";

/** Legacy (Vercel Connect MCP/REST) connector facade guidance. */
const LEGACY_CONNECTIONS_GUIDANCE = `For third-party services (Linear, Slack, GitHub, Notion, etc.), call \`connection_search\` with a natural-language query to find matching tools. When the user names a service (e.g. "Slack"), pass \`connection: "slack"\` or include the service name in the query — only that connector is probed. Call \`connection_search\` once per user request or when you need a new capability; reuse \`qualifiedName\` and \`argsSchema\` from earlier results in this conversation instead of searching again before every \`connection_call\`. Invoke matched tools with \`connection_call\` using the returned \`qualifiedName\` and args that match \`argsSchema\` exactly (e.g. Slack \`slack_send_message\` uses \`channel_id\` and \`text\`, not \`channel\`/\`message\`). If a service is not connected, call \`request_connection\` and wait for the user. Never assume a connector the user did not ask for.`;

/** Composio Tool Router guidance (native tool search + execute meta-tools). */
const COMPOSIO_CONNECTIONS_GUIDANCE = `Third-party services (Gmail, Google Drive, Google Calendar, Slack, Notion, GitHub, Linear, X) are reachable through connector tools. Use the provided tool-search tool with a natural-language query to discover the right action for the task, then execute it with the returned tool. When the user names a service, include it in the query so only that toolkit is searched. If a required service is not yet connected, use the connection-management tool to get an authorization link, share it with the user, and wait for them to connect. Never assume a service the user did not ask for.`;

/** Connector backend whose tools this run exposes (drives the prompt guidance). */
export type ConnectorKind = "composio" | "legacy";

function connectionsGuidance(connectorKind: ConnectorKind | undefined): string {
  return connectorKind === "legacy"
    ? LEGACY_CONNECTIONS_GUIDANCE
    : COMPOSIO_CONNECTIONS_GUIDANCE;
}

/** User-facing tone for chat and task runtimes. */
export const COMMUNICATION_STYLE = `Use a professional workplace tone — the voice of a capable colleague briefing stakeholders. Be direct, substantive, and respectful. Do not use emojis, emoticons, stickers, or decorative symbols. Avoid casual banter, slang, hype, or excessive exclamation marks. Prefer complete sentences and structured answers. When the user writes in Korean, respond in polite formal Korean (합니다/습니다체).`;

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
  /** Connector backend active for this run — selects the connections guidance. */
  connectorKind?: ConnectorKind;
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

const EPHEMERAL_CACHE: SystemModelMessage["providerOptions"] = {
  // Anthropic prompt-prefix cache breakpoint (not the AI Gateway response cache).
  anthropic: { cacheControl: { type: "ephemeral" } },
};

/**
 * Static instruction segment — identical for every run of a given runtimeKind.
 * Kept first so it forms a stable, cacheable prefix (tools + this block) that is
 * reused across runs within Anthropic's cache TTL.
 */
function buildStaticInstructionSegment(
  runtimeKind: AgentRuntimeKind,
  connectorKind: ConnectorKind | undefined,
): string {
  const lines: string[] = [LAYER0_RUNTIME_PROMPTS[runtimeKind]];

  if (runtimeKind === "task") {
    lines.push(
      `\n## Finishing`,
      `When done, call complete_task. If blocked, call block_task or request_approval.`,
    );
  }

  if (runtimeKind === "main" || runtimeKind === "task") {
    lines.push(
      `\n## External connections`,
      connectionsGuidance(connectorKind),
    );
    lines.push(`\n## Communication style`, COMMUNICATION_STYLE);
  }

  return lines.filter(Boolean).join("\n");
}

/**
 * Per-run dynamic instruction segment — varies by project/task/schedule. Stable
 * across the multi-step tool loop within a single run, so it is the second cache
 * breakpoint. Returns "" when there is no dynamic content for the runtimeKind.
 */
function buildDynamicInstructionSegment(
  params: BuildRunInstructionsParams,
): string {
  const {
    runtimeKind,
    projectId,
    accountId,
    workflowManifest,
    mainInstruction,
    taskPlaybook,
    task,
  } = params;
  const lines: string[] = [];

  if (runtimeKind === "main") {
    if (workflowManifest && workflowManifest.length > 0) {
      const rows = workflowManifest
        .map((w) => `- ${w.key} — ${w.description || w.name}`)
        .join("\n");
      lines.push(
        `## Available workflows`,
        `Match the user's intent to one of these. Load the full playbook with get_workflow_instruction(<key>) before acting.`,
        rows,
      );
    } else {
      lines.push(
        `## Available workflows`,
        `No workflows are configured for this project yet. Help the user directly or set them up with write_workflow_instruction.`,
      );
    }
  }

  if (runtimeKind === "task" && task) {
    lines.push(
      `## Current task`,
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
  }

  if (runtimeKind === "scheduler" && mainInstruction) {
    lines.push(
      `## Scheduler instruction (${mainInstruction.key})\n${blockNoteContentToText(mainInstruction.content)}`,
    );
  }

  return lines.filter(Boolean).join("\n");
}

/**
 * Build the run's system prompt as an array of `SystemModelMessage`s with
 * Anthropic prompt-cache breakpoints: a static block (shared across runs) and a
 * per-run dynamic block. Pass this directly to `ToolLoopAgent`'s `instructions`.
 */
export function buildRunInstructionMessages(
  params: BuildRunInstructionsParams,
): SystemModelMessage[] {
  const messages: SystemModelMessage[] = [
    {
      role: "system",
      content: buildStaticInstructionSegment(
        params.runtimeKind,
        params.connectorKind,
      ),
      providerOptions: EPHEMERAL_CACHE,
    },
  ];

  const dynamic = buildDynamicInstructionSegment(params);
  if (dynamic) {
    messages.push({
      role: "system",
      content: dynamic,
      providerOptions: EPHEMERAL_CACHE,
    });
  }

  return messages;
}

/**
 * String form of the run instructions (static block first, then dynamic).
 * Retained for callers/tests that need a single string; the runtime uses
 * {@link buildRunInstructionMessages} so prompt caching applies.
 */
export function buildRunInstructions(params: BuildRunInstructionsParams): string {
  return buildRunInstructionMessages(params)
    .map((m) => m.content)
    .join("\n");
}
