import type { AgentTrigger, ToolBundle } from "@ssota/contracts";
import { BUILTIN_AGENT_IDS } from "@ssota/contracts/agents";

/** Tool bundles every agent receives regardless of UI toggles. */
export const BASE_TOOL_BUNDLES: ToolBundle[] = ["graph.read", "tasks.manage"];

/** Optional bundles the settings UI can enable per agent. */
export const OPTIONAL_TOOL_BUNDLES: ToolBundle[] = [
  "graph.write",
  "pages.author",
  "connectors",
  "script_tools",
  "sandbox.code",
  "delegate",
];

export const TOOL_BUNDLE_LABELS: Record<ToolBundle, string> = {
  "graph.read": "Graph read",
  "graph.write": "Graph write",
  "tasks.manage": "Tasks",
  "pages.author": "Pages",
  connectors: "Composio connectors",
  delegate: "Delegate subagents",
  script_tools: "Script tools",
  "sandbox.code": "Sandbox code",
};

export const TRIGGER_LABELS: Record<AgentTrigger, string> = {
  chat: "Web chat (Vercel Chat)",
  chatbot: "Chatbot (Slack / Discord / Telegram)",
  task: "Task dispatch",
  schedule: "Scheduler",
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
  const merged = new Set<ToolBundle>([...BASE_TOOL_BUNDLES, ...selected]);
  return [...merged];
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
