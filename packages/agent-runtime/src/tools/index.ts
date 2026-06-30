import type { ToolSet } from "ai";
import { createGraphTools } from "./graph.js";
import { createTaskTools } from "./tasks.js";
import { createPageTools } from "./pages.js";
import { createAgentDefinitionTools } from "./agent-definitions.js";
import { createDelegateTools } from "./delegate.js";
import { createScriptToolTools } from "./script-tools.js";
import { buildAgentTools, toolBundlesForAgentKey } from "./build-agent-tools.js";

export function createSsotaTools(): ToolSet {
  return {
    ...createGraphTools(),
    ...createTaskTools(),
    ...createPageTools(),
    ...createAgentDefinitionTools(),
    ...createDelegateTools(),
    ...createScriptToolTools(),
  };
}

export {
  createGraphTools,
  createTaskTools,
  createPageTools,
  createAgentDefinitionTools,
  createDelegateTools,
  createScriptToolTools,
  buildAgentTools,
  toolBundlesForAgentKey,
};
