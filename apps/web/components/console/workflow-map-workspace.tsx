"use client";

import type { WorkflowLensPhase } from "@/components/workflow-lens/workflow-lens";
import { WorkflowLens } from "@/components/workflow-lens/workflow-lens";

type WorkflowMapWorkspaceProps = {
  phases: WorkflowLensPhase[];
};

export function WorkflowMapWorkspace({ phases }: WorkflowMapWorkspaceProps) {
  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Workflow Map</h1>
        <p className="text-sm text-muted-foreground">
          Project graph by workflow phase. Click a type card to inspect nodes.
        </p>
      </header>
      <WorkflowLens phases={phases} />
    </div>
  );
}
