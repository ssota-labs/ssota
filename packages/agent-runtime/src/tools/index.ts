import type { ToolSet } from "ai";
import { createGraphTools } from "./graph.js";
import { createTaskTools } from "./tasks.js";
import { createPageTools } from "./pages.js";
import { createWorkflowInstructionTools } from "./workflow-instructions.js";

export function createSsotaTools(): ToolSet {
  return {
    ...createGraphTools(),
    ...createTaskTools(),
    ...createPageTools(),
    ...createWorkflowInstructionTools(),
  };
}

export {
  createGraphTools,
  createTaskTools,
  createPageTools,
  createWorkflowInstructionTools,
};
