import type { RouteOutletTarget } from "@ssota/contracts";
import type { WorkflowDraft } from "@/lib/workflows/workflow-draft";

export function describeOutletTarget(
  draft: WorkflowDraft,
  target: RouteOutletTarget | null | undefined,
): string {
  if (!target) return "Not connected";
  switch (target.kind) {
    case "step": {
      const step = draft.steps.find((item) => item.id === target.stepId);
      return step ? `Step · ${step.title}` : `Step · ${target.stepId}`;
    }
    case "route": {
      const route = draft.routeBlocks.find((item) => item.id === target.routeId);
      return route ? `Route · ${route.label}` : `Route · ${target.routeId}`;
    }
    case "workflow": {
      const block = draft.workflowBlocks.find(
        (item) => item.id === target.workflowBlockId,
      );
      return block
        ? `Workflow · ${block.workflowKey}`
        : `Workflow · ${target.workflowBlockId}`;
    }
  }
}
