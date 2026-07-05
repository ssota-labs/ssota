import type { AgentRuntimeKind } from "@ssota/contracts";
import {
  blockNoteContentToText,
  type AgentDefinition,
  type ExecutionDirective,
  type SkillIndex,
  type TeamspaceMainConfig,
} from "@ssota/contracts";
import type { AgentManifestEntry } from "@ssota/contracts/agents";
import type { SystemModelMessage } from "ai";

/** Composio Tool Router guidance (native tool search + execute meta-tools). */
const COMPOSIO_CONNECTIONS_GUIDANCE = `Third-party services (Gmail, Google Drive, Google Calendar, Slack, Notion, GitHub, Linear, X) are reachable through connector tools. Use COMPOSIO_SEARCH_TOOLS with a natural-language query to discover the right action, then COMPOSIO_MULTI_EXECUTE_TOOL with the returned tool slugs. When the user names a service, include it in the query so only that toolkit is searched. If a required service is not yet connected, use COMPOSIO_MANAGE_CONNECTIONS to get an authorization link, share it with the user, and wait for them to connect. Never assume a service the user did not ask for.`;

/** User-facing tone for chat and task runtimes. */
export const COMMUNICATION_STYLE = `Use a professional workplace tone — the voice of a capable colleague briefing stakeholders. Be direct, substantive, and respectful. Do not use emojis, emoticons, stickers, or decorative symbols. Avoid casual banter, slang, hype, or excessive exclamation marks. Prefer complete sentences and structured answers. When the user writes in Korean, respond in polite formal Korean (합니다/습니다체).`;

export const LAYER0_RUNTIME_PROMPTS: Record<AgentRuntimeKind, string> = {
  main: `You are the SSOTA agent — the operating decision-maker for a single project, acting as the chief of staff / managing executive for the organization that owns it. This is a persistent chat thread, not a task; your job is to make the best decisions available within the project's information.

About SSOTA: a project is one organization's domain workspace, modeled as a typed graph of nodes (records) and edges (relationships), plus workflows (reusable playbooks), tasks (delegated units of work), and pages (data-driven UI rendered from a JSON spec). Three responsibilities are yours:
1. Set up the organization — structure the project toward its goals: author agent definitions (write_agent_definition), build pages (create_page / update_page), and populate the graph (create_node / create_edge).
2. Delegate work — turn goals into tasks (see "Spawning work").
3. Advise — answer questions by reasoning over the project's graph and state.

Persistence: Keep working until the request is fully resolved — only stop when the goal is met or you genuinely need the user's decision. Never assume a tool's outcome before you see its result; wait for each tool response and act on what actually happened. Do not claim a task was spawned, a workflow was written, or a page was created until the tool confirms it.

Routing: Match the user's intent against the "Available agents" list below. When one fits, call get_agent_instruction(<id>) to load its full playbook before acting — never inline or guess a playbook. When none fits — including first-time setup — act directly with your tools (e.g. create a missing playbook with write_agent_definition).

Spawning work: Spawn tasks only when work should run in the background or be delegated to an executor. Each spawned task must include a full executionDirective (goal, background, steps, constraints) so the executor can run without asking follow-up questions.

Graph context: read with query_nodes / get_node / traverse_edges, write with create_node / update_node / create_edge. Prefer task.targetNodeId when set, and get_node before update_node.`,

  task: `You are the SSOTA task runtime agent. You execute exactly one task per run. Your prompt includes the task playbook (fetched) and an inline executionDirective from the spawner — follow both. Use tools to read/write the graph and tasks. When complete, call complete_task; if blocked, call block_task or request_approval.`,

  /** @deprecated Scheduler no longer runs a model; cron fans out to main/task workflows. */
  scheduler: `Deprecated scheduler runtime.`,

  worker: `Worker sandbox runtime — no LLM; TypeScript executes in an isolated sandbox.`,
};

export interface BuildRunInstructionsParams {
  runtimeKind: AgentRuntimeKind;
  teamspaceId: string;
  accountId?: string;
  /** Skill-style routing manifest for the main runtime (id + when-to-use). */
  agentManifest?: AgentManifestEntry[];
  /** Skill-style routing manifest (name + when-to-use). */
  skillManifest?: SkillIndex[];
  mainConfig?: TeamspaceMainConfig | null;
  taskPlaybook?: AgentDefinition | null;
  /** Specialist agent invoked from chat (Slack/web), not a task run. */
  specialistChatPlaybook?: AgentDefinition | null;
  task?: {
    id: string;
    title: string;
    acceptanceCriteria: unknown[];
    targetNodeId?: string | null;
    executionDirective?: ExecutionDirective | null;
  };
}

const EPHEMERAL_CACHE: SystemModelMessage["providerOptions"] = {
  anthropic: { cacheControl: { type: "ephemeral" } },
};

function buildStaticInstructionSegment(runtimeKind: AgentRuntimeKind): string {
  const lines: string[] = [LAYER0_RUNTIME_PROMPTS[runtimeKind]];

  if (runtimeKind === "task") {
    lines.push(
      `\n## Finishing`,
      `When done, call complete_task. If blocked, call block_task or request_approval.`,
    );
  }

  if (runtimeKind === "main" || runtimeKind === "task") {
    lines.push(`\n## External connections`, COMPOSIO_CONNECTIONS_GUIDANCE);
    lines.push(`\n## Communication style`, COMMUNICATION_STYLE);
  }

  return lines.filter(Boolean).join("\n");
}

function buildDynamicInstructionSegment(
  params: BuildRunInstructionsParams,
): string {
  const {
    runtimeKind,
    teamspaceId,
    accountId,
    agentManifest,
    skillManifest,
    taskPlaybook,
    task,
  } = params;
  const lines: string[] = [];

  if (runtimeKind === "main") {
    if (params.specialistChatPlaybook) {
      const playbook = params.specialistChatPlaybook;
      lines.push(
        `## Specialist chat mode`,
        `You are ${playbook.name} in a live chat thread. Answer the user's message directly using your playbook and tools. This is not a delegated task run — do not call get_task, update_task, complete_task, or block_task unless the user names a specific task id.`,
        `\n## Agent playbook (${playbook.name})`,
        blockNoteContentToText(playbook.instructions),
      );
    } else if (agentManifest && agentManifest.length > 0) {
      const rows = agentManifest
        .map((w) => `- ${w.id} (${w.name}) — ${w.description}`)
        .join("\n");
      lines.push(
        `## Available agents`,
        `Match the user's intent to one of these. Load the full playbook with get_agent_instruction(<id>) before acting.`,
        rows,
      );
    } else {
      lines.push(
        `## Available agents`,
        `No agents are configured for this project yet. Help the user directly or set them up with write_agent_definition.`,
      );
    }
    const customInstructions = params.mainConfig?.instructions;
    if (customInstructions && customInstructions.length > 0) {
      const text = blockNoteContentToText(customInstructions).trim();
      if (text) {
        lines.push(`\n## Project custom instructions`, text);
      }
    }
    if (skillManifest && skillManifest.length > 0) {
      const rows = skillManifest
        .map((s) => `- ${s.key}: ${s.description}`)
        .join("\n");
      lines.push(
        `## Available skills`,
        `Load with read_skill(<key>) when the task matches a skill description.`,
        rows,
      );
    }
  }

  if (runtimeKind === "task") {
    if (skillManifest && skillManifest.length > 0) {
      const rows = skillManifest
        .map((s) => `- ${s.key}: ${s.description}`)
        .join("\n");
      lines.push(
        `## Available skills`,
        `Load with read_skill(<key>) when the task matches a skill description.`,
        rows,
      );
    }
  }

  if (runtimeKind === "task" && task) {
    lines.push(
      `## Current task`,
      `- teamspaceId: ${teamspaceId}`,
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
        `\n## Agent playbook (${taskPlaybook.name})`,
        blockNoteContentToText(taskPlaybook.instructions),
      );
    }
  }

  return lines.filter(Boolean).join("\n");
}

export function buildRunInstructionMessages(
  params: BuildRunInstructionsParams,
): SystemModelMessage[] {
  const messages: SystemModelMessage[] = [
    {
      role: "system",
      content: buildStaticInstructionSegment(params.runtimeKind),
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

export function buildRunInstructions(params: BuildRunInstructionsParams): string {
  return buildRunInstructionMessages(params)
    .map((m) => m.content)
    .join("\n");
}
