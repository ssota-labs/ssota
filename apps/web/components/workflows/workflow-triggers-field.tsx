"use client";

import { PlayIcon, PlusIcon } from "@phosphor-icons/react";
import { Button } from "@ssota/ui/components/ui/button";
import { Label } from "@ssota/ui/components/ui/label";
import { serializeWorkflowTriggers } from "@/lib/workflows/workflow-trigger-catalog";

export function WorkflowTriggersField({
  onAddTrigger,
}: {
  onAddTrigger: () => void;
}) {
  return (
    <>
      <div className="space-y-1 pt-2.5">
        <Label className="text-sm font-normal">Triggers</Label>
        <p className="text-xs text-muted-foreground">
          When should this workflow run?
        </p>
      </div>

      <div className="min-w-0 space-y-3">
        <div className="overflow-hidden rounded-lg border bg-card">
          <ul className="divide-y">
            <li className="flex items-center gap-3 px-3 py-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted/30">
                <PlayIcon className="size-4 text-muted-foreground" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">Run manually</span>
                <span className="block text-xs text-muted-foreground">
                  Console 또는 MCP에서 직접 실행합니다.
                </span>
              </span>
            </li>
          </ul>

          <div className="border-t px-3 py-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground"
              data-testid="add-workflow-trigger"
              onClick={onAddTrigger}
            >
              <PlusIcon className="size-3.5" />
              Add trigger
            </Button>
          </div>
        </div>

        <input
          type="hidden"
          name="workflowTriggers"
          value={serializeWorkflowTriggers([{ kind: "manual" }])}
        />
      </div>
    </>
  );
}
