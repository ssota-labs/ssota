import type { StepResult, ToolSet } from "ai";
import {
  connectionSearchResultSchema,
  type ConnectionSearchResult,
} from "./connection-search-result.js";
import {
  ConnectionRunState,
  CONNECTION_SEARCH_TOOL,
  ALWAYS_ACTIVE_TOOL_NAMES,
} from "./run-state.js";

export function parseConnectionSearchOutput(
  output: unknown,
): ConnectionSearchResult | null {
  const parsed = connectionSearchResultSchema.safeParse(output);
  return parsed.success ? parsed.data : null;
}

/** Merge every `connection_search` tool result from prior steps into run state. */
export function syncConnectionRunStateFromSteps(
  state: ConnectionRunState,
  steps: Array<StepResult<ToolSet>>,
): void {
  for (const step of steps) {
    for (const result of step.toolResults) {
      if (result.toolName !== CONNECTION_SEARCH_TOOL) continue;
      const parsed = parseConnectionSearchOutput(result.output);
      if (!parsed) continue;
      state.activateFromSearch(parsed.tools);
    }
  }
}

export function buildActiveTools(
  state: ConnectionRunState,
  qualifiedToolNames: string[],
  extraAlwaysActive: string[] = [],
): string[] {
  const active = new Set<string>([
    ...ALWAYS_ACTIVE_TOOL_NAMES,
    ...extraAlwaysActive,
  ]);
  for (const name of qualifiedToolNames) {
    if (state.activatedQualifiedTools.has(name)) {
      active.add(name);
    }
  }
  return [...active];
}

export { ALWAYS_ACTIVE_TOOL_NAMES };
