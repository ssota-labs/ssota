import type { ScriptTool, ScriptToolIndex } from "@ssota/contracts";

export interface ScriptToolReadPort {
  listScriptTools(): Promise<ScriptToolIndex[]>;
  getByKey(key: string): Promise<ScriptTool | null>;
  listForAgentDefinition(agentDefinitionId: string): Promise<ScriptTool[]>;
}

export type ScriptToolPort = ScriptToolReadPort;
