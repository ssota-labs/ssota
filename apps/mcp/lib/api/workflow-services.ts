import type { WorkflowInstruction } from "@ssota/contracts";
import { blockNoteContentToText } from "@ssota/contracts";
import {
  getBuiltinWorkflowByKey,
  listBuiltinWorkflowIndex,
} from "@ssota/contracts/workflows";
import { createWorkflowInstructionPort } from "@ssota/adapter-postgres";
import type { getDb } from "@/lib/ports";

type Db = ReturnType<typeof getDb>;

export interface WorkflowSummary {
  id: string | null;
  key: string;
  name: string;
  description: string;
}

function serializeWorkflowSummary(entry: WorkflowInstruction): WorkflowSummary {
  return {
    id: entry.id,
    key: entry.key,
    name: entry.name,
    description: entry.description,
  };
}

export async function listWorkflowsForMcp(db: Db, projectId: string) {
  const port = createWorkflowInstructionPort(db, { projectId });
  const items = await port.listInstructions();
  const dbKeys = new Set(items.map((w) => w.key));
  // DB rows override code built-ins (e.g. agent.setup) with the same key.
  const builtins: WorkflowSummary[] = listBuiltinWorkflowIndex()
    .filter((b) => !dbKeys.has(b.key))
    .map((b) => ({ id: null, ...b }));
  return { workflows: [...items, ...builtins] };
}

export async function getWorkflowForMcp(
  db: Db,
  projectId: string,
  workflowKey: string,
): Promise<WorkflowSummary | null> {
  const port = createWorkflowInstructionPort(db, { projectId });
  const entry = await port.getByKey(workflowKey);
  if (entry) return serializeWorkflowSummary(entry);
  const builtin = getBuiltinWorkflowByKey(workflowKey);
  if (!builtin) return null;
  return {
    id: null,
    key: builtin.workflowKey,
    name: builtin.title,
    description: builtin.description,
  };
}

export async function getWorkflowInstructionForMcp(
  db: Db,
  projectId: string,
  workflowKey: string,
) {
  const port = createWorkflowInstructionPort(db, { projectId });
  const entry = await port.getByKey(workflowKey);
  if (entry) {
    return {
      workflowKey: entry.key,
      instruction: blockNoteContentToText(entry.content),
    };
  }
  const builtin = getBuiltinWorkflowByKey(workflowKey);
  if (!builtin) return null;
  return { workflowKey: builtin.workflowKey, instruction: builtin.instruction };
}
