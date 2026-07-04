import type { AgentTrigger, ToolBundle } from "@ssota/contracts";
import {
  DEFAULT_AGENT_TOOL_BUNDLES,
  mergeAgentToolBundles,
} from "@ssota/contracts";
import { BUILTIN_AGENT_IDS } from "@ssota/contracts/agents";

/** @deprecated Use DEFAULT_AGENT_TOOL_BUNDLES from @ssota/contracts */
export const BASE_TOOL_BUNDLES: ToolBundle[] = [...DEFAULT_AGENT_TOOL_BUNDLES];

/** Optional bundles the settings UI can enable per agent. */
export const OPTIONAL_TOOL_BUNDLES: ToolBundle[] = [
  "graph.write",
  "pages.author",
  "sandbox.code",
  "delegate",
];

export const TOOL_BUNDLE_LABELS: Record<ToolBundle, string> = {
  "graph.read": "Graph read",
  "graph.write": "Graph write",
  "tasks.manage": "Tasks",
  "pages.author": "Pages",
  connectors: "Connectors",
  delegate: "Delegate subagents",
  script_tools: "TypeScript scripts",
  "skills.read": "Runtime skills",
  "sandbox.code": "Sandbox code",
};

export const TRIGGER_LABELS: Record<AgentTrigger, string> = {
  chat: "Web chat",
  chatbot: "Chatbot (Slack / Discord / Telegram)",
  task: "When assigned to a task",
  schedule: "Schedules",
  heartbeat: "Heartbeat",
  manual: "Manual run",
  gate_resume: "Gate resume",
};

export const WORKER_AGENT_IDS = [
  BUILTIN_AGENT_IDS.workerNotion,
  BUILTIN_AGENT_IDS.workerGraphBatch,
  BUILTIN_AGENT_IDS.workerConnectorSync,
  BUILTIN_AGENT_IDS.workerReportBuilder,
] as const;

export function isWorkerAgentId(id: string): boolean {
  return (WORKER_AGENT_IDS as readonly string[]).includes(id);
}

export function mergeToolBundles(selected: ToolBundle[]): ToolBundle[] {
  return mergeAgentToolBundles(selected);
}

export function splitToolBundles(bundles: ToolBundle[]): {
  base: ToolBundle[];
  optional: ToolBundle[];
} {
  const baseSet = new Set(BASE_TOOL_BUNDLES);
  return {
    base: bundles.filter((b) => baseSet.has(b)),
    optional: bundles.filter((b) => !baseSet.has(b)),
  };
}
