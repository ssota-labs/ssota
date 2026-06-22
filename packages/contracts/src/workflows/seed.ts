import { textToBlockNoteContent } from "../workflow-instruction.js";
import type { WorkflowInstructionSeed } from "../workflow-instruction.js";

type WorkflowSeedSource = {
  workflowKey: string;
  title: string;
  category: string;
  instruction: string;
};

/** Embedded registry converted to BlockNote seeds for DB bootstrap only. */
export function buildWorkflowInstructionSeeds(
  registry: Record<string, WorkflowSeedSource>,
): WorkflowInstructionSeed[] {
  return Object.values(registry).map((entry) => ({
    key: entry.workflowKey,
    name: entry.title,
    description: entry.category,
    content: textToBlockNoteContent(entry.instruction),
  }));
}
