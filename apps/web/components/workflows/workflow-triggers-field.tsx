"use client";

import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
import type { WorkflowTriggerEvent } from "@ssota/contracts";
import { Button } from "@ssota/ui/components/ui/button";
import { Label } from "@ssota/ui/components/ui/label";
import { Switch } from "@ssota/ui/components/ui/switch";
import { cn } from "@ssota/ui/lib/utils";
import {
  getWorkflowTriggerMeta,
  serializeWorkflowTriggers,
} from "@/lib/workflows/workflow-trigger-catalog";

export function WorkflowTriggersField({
  triggers,
  onTriggersChange,
  onAddTrigger,
  readOnly = false,
  className,
}: {
  triggers: WorkflowTriggerEvent[];
  onTriggersChange?: (triggers: WorkflowTriggerEvent[]) => void;
  onAddTrigger?: () => void;
  readOnly?: boolean;
  className?: string;
}) {
  function setTriggerEnabled(id: string, enabled: boolean) {
    if (readOnly || !onTriggersChange) return;
    const next = triggers.map((trigger) =>
      trigger.id === id ? { ...trigger, enabled } : trigger,
    );
    const enabledCount = next.filter((trigger) => trigger.enabled).length;
    if (enabledCount === 0) return;
    onTriggersChange(next);
  }

  function removeTrigger(id: string) {
    if (readOnly || !onTriggersChange || triggers.length <= 1) return;
    let next = triggers.filter((trigger) => trigger.id !== id);
    if (!next.some((trigger) => trigger.enabled)) {
      next = next.map((trigger, index) =>
        index === 0 ? { ...trigger, enabled: true } : trigger,
      );
    }
    onTriggersChange(next);
  }

  return (
    <div className={cn("space-y-3 px-6", className)}>
      <div className="space-y-1">
        <Label className="text-sm font-medium">Triggers</Label>
        <p className="text-sm text-muted-foreground">
          When should this workflow run?
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <ul className="divide-y">
          {triggers.map((trigger) => {
            const meta = getWorkflowTriggerMeta(trigger.kind);
            const Icon = meta.icon;

            return (
              <li
                key={trigger.id}
                className="flex items-center gap-3 px-3 py-3"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted/30">
                  <Icon className="size-4 text-muted-foreground" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{meta.label}</span>
                  <span className="block text-xs text-muted-foreground">
                    {meta.description}
                  </span>
                </span>
                <div className="flex shrink-0 items-center gap-0.5">
                  <Switch
                    checked={trigger.enabled}
                    disabled={readOnly}
                    onCheckedChange={(checked) =>
                      setTriggerEnabled(trigger.id, checked)
                    }
                    aria-label={`${meta.label} enabled`}
                  />
                  {!readOnly && onTriggersChange ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="size-8 shrink-0 text-muted-foreground hover:bg-destructive/10! hover:text-destructive! [&_svg]:text-current"
                      disabled={triggers.length <= 1}
                      onClick={() => removeTrigger(trigger.id)}
                      aria-label={`Remove ${meta.label}`}
                      data-testid={`remove-workflow-trigger-${trigger.id}`}
                    >
                      <TrashIcon className="size-4" />
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>

        {!readOnly && onAddTrigger ? (
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
        ) : null}
      </div>

      {!readOnly ? (
        <input
          type="hidden"
          name="workflowTriggers"
          value={serializeWorkflowTriggers(triggers)}
        />
      ) : null}
    </div>
  );
}
