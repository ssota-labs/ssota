import { getWorkflowInstructionPort } from "@/lib/ports";
import {
  isVirtualWorkflowInstructionId,
  loadWorkflowInstructionsForUi,
} from "@/lib/console/load-workflow-instructions-for-ui";

/**
 * A schedule's `workflowInstructionId` is a real FK. The UI may hand us a
 * `virtual:{key}` id for a code-defined instruction the user never saved — in
 * that case persist it (idempotent upsert) and return the resulting uuid.
 * Returns null if the id resolves to nothing.
 */
export async function resolveWorkflowInstructionId(
  projectId: string,
  instructionId: string,
): Promise<string | null> {
  if (!isVirtualWorkflowInstructionId(instructionId)) {
    const existing = await getWorkflowInstructionPort(projectId).getById(
      instructionId,
    );
    return existing ? existing.id : null;
  }

  const all = await loadWorkflowInstructionsForUi(projectId);
  const virtual = all.find((entry) => entry.id === instructionId);
  if (!virtual) return null;

  const saved = await getWorkflowInstructionPort(projectId).upsertInstruction({
    key: virtual.key,
    name: virtual.name,
    description: virtual.description,
    content: virtual.content,
  });
  return saved.id;
}
