import {
  getWorkflowByKey,
  RESERVED_MAIN_WORKFLOW_KEY,
  type WorkflowCategory,
  type WorkflowInstruction,
} from "@ssota/contracts";
import { getBuiltinWorkflowByKey } from "@ssota/contracts/workflows";

export type WorkflowInstructionGroupKey =
  | "main"
  | WorkflowCategory
  | "custom";

const GROUP_ORDER: WorkflowInstructionGroupKey[] = [
  "main",
  "orchestrator",
  "recurring",
  "work",
  "initiative",
  "custom",
];

const GROUP_LABEL: Record<WorkflowInstructionGroupKey, string> = {
  main: "Main agent",
  orchestrator: "Orchestrator",
  recurring: "Recurring",
  work: "Work",
  initiative: "Initiative",
  custom: "Custom",
};

export function workflowInstructionGroupKey(
  instructionKey: string,
): WorkflowInstructionGroupKey {
  if (instructionKey === RESERVED_MAIN_WORKFLOW_KEY) return "main";
  const definition = getWorkflowByKey(instructionKey);
  if (definition) return definition.category;
  const builtin = getBuiltinWorkflowByKey(instructionKey);
  if (builtin) return builtin.category;
  return "custom";
}

export function groupWorkflowInstructions(
  instructions: WorkflowInstruction[],
): Array<{
  key: WorkflowInstructionGroupKey;
  label: string;
  items: WorkflowInstruction[];
}> {
  const buckets = new Map<WorkflowInstructionGroupKey, WorkflowInstruction[]>();

  for (const instruction of instructions) {
    const groupKey = workflowInstructionGroupKey(instruction.key);
    const list = buckets.get(groupKey) ?? [];
    list.push(instruction);
    buckets.set(groupKey, list);
  }

  return GROUP_ORDER.filter((key) => (buckets.get(key)?.length ?? 0) > 0).map(
    (key) => ({
      key,
      label: GROUP_LABEL[key],
      items: (buckets.get(key) ?? []).toSorted((a, b) =>
        a.name.localeCompare(b.name),
      ),
    }),
  );
}
