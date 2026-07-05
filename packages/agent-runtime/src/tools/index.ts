import type { ToolSet } from "ai";
import { createGraphTools } from "./graph.js";
import { createTaskTools } from "./tasks.js";
import { createPageTools } from "./pages.js";
import { createAgentDefinitionTools } from "./agent-definitions.js";
import { createDelegateTools } from "./delegate.js";
import { createWorkerTools, createScriptToolTools } from "./worker-tools.js";
import { createSkillTools } from "./skills.js";
import { buildAgentTools, toolBundlesForAgentDefinitionId } from "./build-agent-tools.js";

export function createSsotaTools(): ToolSet {
  return {
    ...createGraphTools(),
    ...createTaskTools(),
    ...createPageTools(),
    ...createAgentDefinitionTools(),
    ...createDelegateTools(),
    ...createWorkerTools(),
    ...createSkillTools(),
  };
}

export {
  createGraphTools,
  createTaskTools,
  createPageTools,
  createAgentDefinitionTools,
  createDelegateTools,
  createWorkerTools,
  createScriptToolTools,
  createSkillTools,
  buildAgentTools,
  toolBundlesForAgentDefinitionId,
};
