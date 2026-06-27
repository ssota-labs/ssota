import {
  markdownToBlockNoteContent,
  normalizeWorkflowInstructionContent,
  type WorkflowInstruction,
} from "@ssota/contracts";
import {
  getBuiltinWorkflowByKey,
  getWorkflowByKey,
  listBuiltinWorkflowIndex,
  listWorkflowKeys,
} from "@ssota/contracts/workflows";
import { groupWorkflowInstructions } from "@/lib/console/workflow-instruction-groups";
import { getWorkflowInstructionPort } from "@/lib/ports";

export type WorkflowInstructionGroup = ReturnType<
  typeof groupWorkflowInstructions
>[number];

const VIRTUAL_ID_PREFIX = "virtual:";

export function isVirtualWorkflowInstructionId(id: string): boolean {
  return id.startsWith(VIRTUAL_ID_PREFIX);
}

function virtualInstruction(
  teamspaceId: string,
  key: string,
  name: string,
  description: string,
  instructionText: string,
): WorkflowInstruction {
  const now = new Date(0).toISOString();
  return {
    id: `${VIRTUAL_ID_PREFIX}${key}`,
    teamspaceId,
    accountId: null,
    key,
    name,
    description,
    content: normalizeWorkflowInstructionContent(
      markdownToBlockNoteContent(instructionText),
    ),
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Teamspace DB rows plus code-defined builtins/registry entries not yet overridden
 * in the DB. Virtual rows use ids `virtual:{key}` until the user saves.
 */
export async function loadWorkflowInstructionsForUi(
  teamspaceId: string,
): Promise<WorkflowInstruction[]> {
  const port = getWorkflowInstructionPort(teamspaceId);
  const indices = await port.listInstructions();
  const dbRows = (
    await Promise.all(indices.map((entry) => port.getById(entry.id)))
  ).filter((entry): entry is WorkflowInstruction => entry !== null);

  const byKey = new Map(
    dbRows.map((row) => [
      row.key,
      {
        ...row,
        content: normalizeWorkflowInstructionContent(row.content),
      },
    ]),
  );

  for (const builtin of listBuiltinWorkflowIndex()) {
    if (byKey.has(builtin.key)) continue;
    const definition = getBuiltinWorkflowByKey(builtin.key);
    if (!definition) continue;
    byKey.set(
      builtin.key,
      virtualInstruction(
        teamspaceId,
        builtin.key,
        builtin.name,
        builtin.description,
        definition.instruction,
      ),
    );
  }

  for (const key of listWorkflowKeys()) {
    if (byKey.has(key)) continue;
    const definition = getWorkflowByKey(key);
    if (!definition) continue;
    byKey.set(
      key,
      virtualInstruction(
        teamspaceId,
        key,
        definition.title,
        definition.description,
        definition.instruction,
      ),
    );
  }

  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadWorkflowInstructionGroupsForUi(
  teamspaceId: string,
): Promise<WorkflowInstructionGroup[]> {
  const instructions = await loadWorkflowInstructionsForUi(teamspaceId);
  return groupWorkflowInstructions(instructions);
}
