import type { ToolSet } from "ai";
import { createGraphTools } from "./graph.js";
import { createTaskTools } from "./tasks.js";

/**
 * The full SSOTA tool set bound to `@ssota/core` use-cases. Each tool reads its
 * `projectId` (and later `accountId`) from the per-run `experimental_context`,
 * so the same tool set serves every run.
 */
export function createSsotaTools(): ToolSet {
  return {
    ...createGraphTools(),
    ...createTaskTools(),
  };
}

export { createGraphTools, createTaskTools };
