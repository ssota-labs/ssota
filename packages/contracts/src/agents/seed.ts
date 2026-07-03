import { textToBlockNoteContent } from "../agent-definition.js";
import type { AgentDefinitionSeed } from "../agent-definition.js";

type AgentSeedSource = {
  id: string;
  title: string;
  description: string;
  instruction: string;
  toolBundles?: AgentDefinitionSeed["toolBundles"];
  nodeScopes?: AgentDefinitionSeed["nodeScopes"];
  runPolicy?: AgentDefinitionSeed["runPolicy"];
};

/** Embedded registry converted to BlockNote seeds for DB bootstrap only. */
export function buildAgentDefinitionSeeds(
  registry: Record<string, AgentSeedSource>,
): AgentDefinitionSeed[] {
  return Object.values(registry).map((entry) => ({
    id: entry.id,
    name: entry.title,
    description: entry.description,
    instructions: textToBlockNoteContent(entry.instruction),
    toolBundles: entry.toolBundles ?? [],
    nodeScopes: entry.nodeScopes ?? [],
    runPolicy: entry.runPolicy ?? {},
  }));
}
