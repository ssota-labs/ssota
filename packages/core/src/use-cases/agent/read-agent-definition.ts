import type {
  UpsertAgentDefinitionInput,
  AgentDefinition,
  AgentDefinitionIndex,
} from "@ssota/contracts";

export async function listAgentDefinitions(
  port: { listDefinitions(): Promise<AgentDefinitionIndex[]> },
): Promise<AgentDefinitionIndex[]> {
  return port.listDefinitions();
}

export async function readAgentDefinitionById(
  port: { getById(id: string): Promise<AgentDefinition | null> },
  id: string,
): Promise<{ source: "db"; definition: AgentDefinition } | null> {
  const row = await port.getById(id);
  if (!row) return null;
  return { source: "db", definition: row };
}
