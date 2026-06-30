import { textToBlockNoteContent } from "../agent-definition.js";
import type { AgentDefinitionSeed } from "../agent-definition.js";

type AgentSeedSource = {
  agentKey: string;
  title: string;
  description: string;
  instruction: string;
  agentKind: AgentDefinitionSeed["agentKind"];
  toolBundles?: AgentDefinitionSeed["toolBundles"];
  nodeScopes?: AgentDefinitionSeed["nodeScopes"];
  runPolicy?: AgentDefinitionSeed["runPolicy"];
};

/** Embedded registry converted to BlockNote seeds for DB bootstrap only. */
export function buildAgentDefinitionSeeds(
  registry: Record<string, AgentSeedSource>,
): AgentDefinitionSeed[] {
  return Object.values(registry).map((entry) => ({
    key: entry.agentKey,
    name: entry.title,
    description: entry.description,
    instructions: textToBlockNoteContent(entry.instruction),
    agentKind: entry.agentKind,
    toolBundles: entry.toolBundles ?? [],
    nodeScopes: entry.nodeScopes ?? [],
    runPolicy: entry.runPolicy ?? {},
  }));
}
