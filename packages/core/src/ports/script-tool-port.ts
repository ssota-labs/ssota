import type { ScriptTool, ScriptToolIndex } from "@ssota/contracts";

export interface ScriptToolReadPort {
  listScriptTools(): Promise<ScriptToolIndex[]>;
  getByKey(key: string): Promise<ScriptTool | null>;
  listForAgentDefinition(agentDefinitionId: string): Promise<ScriptTool[]>;
  listLinkedScriptToolIds(agentDefinitionId: string): Promise<string[]>;
}

export interface ScriptToolWritePort {
  setAgentScriptTools(
    agentDefinitionId: string,
    scriptToolIds: string[],
  ): Promise<void>;
}

export type ScriptToolPort = ScriptToolReadPort & ScriptToolWritePort;
