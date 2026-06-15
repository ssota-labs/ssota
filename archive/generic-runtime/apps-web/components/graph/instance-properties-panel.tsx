"use client";

import { useState, useTransition } from "react";
import { updateNodePropertiesFormAction } from "@/app/actions";
import { PropertyFieldEditor } from "@/components/graph/property-field-editor";
import type { PropertyFieldDefinition } from "@/lib/graph/property-field-types";
import { cn } from "@ssota/ui/lib/utils";

type InstancePropertiesPanelProps = {
  projectId: string;
  nodeSlug: string;
  nodeId: string;
  properties: Record<string, unknown>;
  fields: PropertyFieldDefinition[];
  onUpdated: (properties: Record<string, unknown>) => void;
};

export function InstancePropertiesPanel({
  projectId,
  nodeSlug,
  nodeId,
  properties,
  fields,
  onUpdated,
}: InstancePropertiesPanelProps) {
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function saveProperty(key: string, value: unknown) {
    setPendingKey(key);
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("projectId", projectId);
      formData.set("nodeSlug", nodeSlug);
      formData.set("nodeId", nodeId);
      formData.set("propertyKey", key);
      formData.set("value", JSON.stringify(value));
      const result = await updateNodePropertiesFormAction(formData);
      setPendingKey(null);
      if (!result.ok) {
        setError(result.error ?? "Failed to update property");
        return;
      }
      onUpdated({ ...properties, [key]: value });
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border/70 bg-background">
      <div className="border-b border-border/70 px-5 py-3">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Record
        </div>
        <div className="mt-1 font-mono text-xs text-foreground">{nodeId}</div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="divide-y divide-border/60">
          {fields.map((field) => (
            <div
              key={field.key}
              className={cn(
                "px-5 py-3 transition-colors",
                pendingKey === field.key && isPending && "bg-muted/30",
              )}
            >
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <label
                  htmlFor={`property-${field.key}`}
                  className="text-xs font-medium text-foreground"
                >
                  {field.label}
                </label>
                <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                  {field.valueType}
                  {field.required ? " · required" : ""}
                </span>
              </div>
              <div
                id={`property-${field.key}`}
                className="rounded-md border border-border/80 bg-muted/15 px-2 py-1 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20"
              >
                <PropertyFieldEditor
                  field={field}
                  value={properties[field.key]}
                  variant="panel"
                  disabled={pendingKey === field.key && isPending}
                  onChange={() => {}}
                  onCommit={(nextValue) => saveProperty(field.key, nextValue)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      {error ? (
        <div className="border-t border-destructive/30 bg-destructive/5 px-5 py-2 text-xs text-destructive">
          {error}
        </div>
      ) : null}
    </div>
  );
}
