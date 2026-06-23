import { explorerSubagent } from "./explorer.js";

/**
 * Registry of subagents the parent can launch via the `delegate` tool. Each
 * entry advertises a `shortDescription` (when to use) and the standing agent.
 * Add new subagents (summarizer, critic, …) here.
 */
export const SUBAGENT_REGISTRY = {
  explorer: {
    shortDescription:
      "Read-only workspace explorer. Use to investigate the project's catalog, graph, pages, workflows, and tasks and return a concise summary — without changing anything.",
    agent: explorerSubagent,
  },
} as const;

export const SUBAGENT_TYPES = Object.keys(SUBAGENT_REGISTRY) as [
  keyof typeof SUBAGENT_REGISTRY,
  ...(keyof typeof SUBAGENT_REGISTRY)[],
];

export type SubagentType = keyof typeof SUBAGENT_REGISTRY;

export function buildSubagentSummaryLines(): string {
  return SUBAGENT_TYPES.map(
    (type) => `- \`${type}\` — ${SUBAGENT_REGISTRY[type].shortDescription}`,
  ).join("\n");
}
