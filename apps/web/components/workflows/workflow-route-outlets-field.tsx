"use client";

import { FlowArrowIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import type { RouteOutlet } from "@ssota/contracts";
import { Button } from "@ssota/ui/components/ui/button";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";
import { cn } from "@ssota/ui/lib/utils";
import { describeOutletTarget } from "@/lib/workflows/workflow-route-labels";
import {
  addRouteOutlet,
  removeRouteOutlet,
  updateRouteOutlet,
  type WorkflowDraft,
} from "@/lib/workflows/workflow-draft";
import { WorkflowInspectorSheetHeader } from "@/components/workflows/workflow-inspector-sheet-header";

export function WorkflowRouteOutletsField({
  draft,
  routeId,
  outlets,
  onDraftChange,
  readOnly = false,
  inspectorHeader = false,
  className,
}: {
  draft: WorkflowDraft;
  routeId: string;
  outlets: RouteOutlet[];
  onDraftChange: (draft: WorkflowDraft) => void;
  readOnly?: boolean;
  inspectorHeader?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(inspectorHeader ? undefined : "space-y-3 px-6", className)}>
      {inspectorHeader ? (
        <WorkflowInspectorSheetHeader
          title="Outlets"
          kind="outlet"
          description="Branches agents can take from this route. Use + on the canvas to connect blocks."
          bordered={false}
        />
      ) : (
        <div className="space-y-1">
          <Label className="text-sm font-medium">Outlets</Label>
          <p className="text-xs text-muted-foreground">
            Branches agents can take from this route.
          </p>
        </div>
      )}

      <div className={cn("space-y-3", inspectorHeader && "px-4 py-4")}>
        <div className="overflow-hidden rounded-lg border bg-card">
          <ul className="divide-y">
            {outlets.map((outlet) => (
              <li
                key={outlet.id}
                className="flex items-start gap-3 px-3 py-3"
                data-testid={`route-outlet-row-${outlet.id}`}
              >
                <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted/30">
                  <FlowArrowIcon className="size-4 text-muted-foreground" />
                </span>
                <span className="min-w-0 flex-1 space-y-2">
                  {readOnly ? (
                    <span className="block text-sm font-medium">{outlet.label}</span>
                  ) : (
                    <Input
                      value={outlet.label}
                      onChange={(event) =>
                        onDraftChange(
                          updateRouteOutlet(draft, routeId, outlet.id, {
                            label: event.target.value,
                          }),
                        )
                      }
                      className="h-8 text-sm"
                      aria-label="Outlet label"
                    />
                  )}
                  <span className="block text-xs text-muted-foreground">
                    {describeOutletTarget(draft, outlet.target)}
                  </span>
                </span>
                {!readOnly ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-8 shrink-0 text-muted-foreground hover:bg-destructive/10! hover:text-destructive! [&_svg]:text-current"
                    disabled={outlets.length <= 1}
                    onClick={() =>
                      onDraftChange(removeRouteOutlet(draft, routeId, outlet.id))
                    }
                    aria-label={`Remove ${outlet.label}`}
                    data-testid={`remove-route-outlet-${outlet.id}`}
                  >
                    <TrashIcon className="size-4" />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>

          {!readOnly ? (
            <div className="border-t px-3 py-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-muted-foreground"
                data-testid="add-route-outlet"
                onClick={() => onDraftChange(addRouteOutlet(draft, routeId))}
              >
                <PlusIcon className="size-3.5" />
                Add outlet
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
