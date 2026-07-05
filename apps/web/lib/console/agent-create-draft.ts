import {
  textToBlockNoteContent,
  type AgentDefinition,
} from "@ssota/contracts";

/** CardListSheet activeId sentinel while composing a new agent in the settings sheet. */
export const CREATE_AGENT_SHEET_ID = "__create-agent__";

export function buildEmptyAgentDefinition(
  teamspaceId: string,
): AgentDefinition {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    teamspaceId,
    accountId: null,
    name: "",
    description: "",
    instructions: textToBlockNoteContent(""),
    toolBundles: [],
    nodeScopes: [],
    runPolicy: { allowedTriggers: ["chat", "task"] },
    createdAt: now,
    updatedAt: now,
  };
}

export function isCreateAgentSheetId(activeId: string | null): boolean {
  return activeId === CREATE_AGENT_SHEET_ID;
}
