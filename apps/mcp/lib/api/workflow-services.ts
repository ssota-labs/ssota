import type { WorkflowInstruction } from "@ssota/contracts";
import {
  blockNoteContentToText,
  type WorkflowInstructionIndex,
} from "@ssota/contracts";
import { createWorkflowInstructionPort } from "@ssota/adapter-supabase";
import type { getDb } from "@/lib/ports";

type Db = ReturnType<typeof getDb>;

export type WorkflowSummary = WorkflowInstructionIndex;

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
  return { workflows: items };
}

export async function getWorkflowForMcp(
  db: Db,
  projectId: string,
  workflowKey: string,
) {
  const port = createWorkflowInstructionPort(db, { projectId });
  const entry = await port.getByKey(workflowKey);
  if (!entry) return null;
  return serializeWorkflowSummary(entry);
}

export async function getWorkflowInstructionForMcp(
  db: Db,
  projectId: string,
  workflowKey: string,
) {
  const port = createWorkflowInstructionPort(db, { projectId });
  const entry = await port.getByKey(workflowKey);
  if (!entry) return null;
  return {
    workflowKey: entry.key,
    instruction: blockNoteContentToText(entry.content),
  };
}
