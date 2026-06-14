"use client";

import { PlusIcon } from "@phosphor-icons/react";
import type { WorkflowTriggerEvent } from "@ssota/contracts";
import { Button } from "@ssota/ui/components/ui/button";
import { Label } from "@ssota/ui/components/ui/label";
import { Switch } from "@ssota/ui/components/ui/switch";
import { useState } from "react";
import {
  defaultWorkflowTriggerEvents,
  getWorkflowTriggerMeta,
  serializeWorkflowTriggers,
} from "@/lib/workflows/workflow-trigger-catalog";

export function WorkflowTriggersField({
  onAddTrigger,
}: {
  onAddTrigger: () => void;
}) {
  const [triggers, setTriggers] = useState<WorkflowTriggerEvent[]>(
    defaultWorkflowTriggerEvents,
  );

  function setTriggerEnabled(id: string, enabled: boolean) {
    setTriggers((current) => {
      const next = current.map((trigger) =>
        trigger.id === id ? { ...trigger, enabled } : trigger,
      );
      const enabledCount = next.filter((trigger) => trigger.enabled).length;
      if (enabledCount === 0) {
        return current;
      }
      return next;
    });
  }

  return (
    <div className="space-y-3 px-6">
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
                <Switch
                  checked={trigger.enabled}
                  onCheckedChange={(checked) =>
                    setTriggerEnabled(trigger.id, checked)
                  }
                  aria-label={`${meta.label} enabled`}
                />
              </li>
            );
          })}
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
        value={serializeWorkflowTriggers(triggers)}
      />
    </div>
  );
}
