"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { PencilSimpleIcon } from "@phosphor-icons/react";
import { updateNodePropertiesBatchFormAction } from "@/app/actions";
import { PropertyFieldEditor } from "@/components/graph/property-field-editor";
import {
  GraphFlowCanvas,
  type GraphFlowEdge,
  type GraphFlowNode,
} from "@/components/graph/graph-flow-canvas";
import type { InstanceGraphRelation } from "@/components/graph/node-instances-view";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@ssota/ui/components/ui/tabs";
import {
  isJsonField,
  supabaseTypeLabel,
  type PropertyFieldDefinition,
} from "@/lib/graph/property-field-types";
import { formatTableCell } from "@/lib/graph/format-table-cell";
import { cn } from "@ssota/ui/lib/utils";

type InstanceRowInspectorProps = {
  projectId: string;
  nodeSlug: string;
  nodeTypeLabel: string;
  nodeId: string;
  lifecycleStatus: string;
  content: string | null;
  updatedAt: string;
  properties: Record<string, unknown>;
  fields: PropertyFieldDefinition[];
  relations: InstanceGraphRelation[];
  flow: { nodes: GraphFlowNode[]; edges: GraphFlowEdge[] };
  onClose: () => void;
  onUpdated: (properties: Record<string, unknown>) => void;
};

export function InstanceRowInspector({
  projectId,
  nodeSlug,
  nodeTypeLabel,
  nodeId,
  lifecycleStatus,
  content,
  updatedAt,
  properties,
  fields,
  relations,
  flow,
  onClose,
  onUpdated,
}: InstanceRowInspectorProps) {
  const [draft, setDraft] = useState(properties);
  const [editingJsonKey, setEditingJsonKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<"fields" | "relations">("fields");

  const changedProperties = useMemo(() => {
    const diff: Record<string, unknown> = {};
    for (const field of fields) {
      const before = properties[field.key];
      const after = draft[field.key];
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        diff[field.key] = after;
      }
    }
    return diff;
  }, [draft, fields, properties]);

  const hasChanges = Object.keys(changedProperties).length > 0;

  const queueChanges = useCallback(() => {
    if (!hasChanges) return;
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("projectId", projectId);
      formData.set("nodeSlug", nodeSlug);
      formData.set("nodeId", nodeId);
      formData.set("properties", JSON.stringify(changedProperties));
      const result = await updateNodePropertiesBatchFormAction(formData);
      if (!result.ok) {
        setError(result.error ?? "Failed to queue changes");
        return;
      }
      const merged = { ...properties, ...changedProperties };
      setDraft(merged);
      setEditingJsonKey(null);
      onUpdated(merged);
    });
  }, [
    changedProperties,
    hasChanges,
    nodeId,
    nodeSlug,
    onUpdated,
    projectId,
    properties,
  ]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        queueChanges();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [queueChanges]);

  return (
    <aside className="supabase-row-inspector flex h-full min-h-0 w-[min(42vw,560px)] shrink-0 flex-col">
      <div className="supabase-row-inspector-header shrink-0">
        Update row from <strong className="font-semibold">{nodeTypeLabel}</strong>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as "fields" | "relations")}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <div className="supabase-row-inspector-tabs shrink-0 py-1">
          <TabsList variant="line" className="bg-transparent">
            <TabsTrigger value="fields">Fields</TabsTrigger>
            <TabsTrigger value="relations">
              Relations{relations.length ? ` (${relations.length})` : ""}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="fields" className="min-h-0 flex-1 overflow-auto p-0">
          <ReadOnlyField label="id" type="uuid" value={nodeId} />
          <ReadOnlyField label="lifecycle_status" type="text" value={lifecycleStatus} />
          {fields.map((field) => (
            <EditableFieldRow
              key={field.key}
              field={field}
              value={draft[field.key]}
              editingJson={editingJsonKey === field.key}
              onChange={(nextValue) =>
                setDraft((current) => ({ ...current, [field.key]: nextValue }))
              }
              onToggleJsonEdit={() =>
                setEditingJsonKey((current) =>
                  current === field.key ? null : field.key,
                )
              }
            />
          ))}
          <ReadOnlyField label="content" type="text" value={content ?? "NULL"} />
          <ReadOnlyField label="updated_at" type="timestamptz" value={updatedAt} />
        </TabsContent>

        <TabsContent value="relations" className="min-h-0 flex-1 p-4">
          <GraphFlowCanvas
            nodes={flow.nodes}
            edges={flow.edges}
            emptyMessage="This instance has no loaded graph relationships yet."
          />
        </TabsContent>
      </Tabs>

      {error ? (
        <div className="shrink-0 border-t border-destructive/40 bg-destructive/10 px-5 py-2 text-xs text-red-400">
          {error}
        </div>
      ) : null}

      <div className="supabase-inspector-footer shrink-0 flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button
          type="button"
          className="supabase-btn-queue"
          disabled={!hasChanges || isPending}
          onClick={queueChanges}
        >
          {isPending ? "Saving…" : "Queue changes"}
          <span className="ml-2 text-[10px] opacity-70">⌘↵</span>
        </Button>
      </div>
    </aside>
  );
}

function ReadOnlyField({
  label,
  type,
  value,
}: {
  label: string;
  type: string;
  value: string;
}) {
  return (
    <div className="supabase-field-row">
      <div>
        <div className="supabase-field-label">{label}</div>
        <div className="supabase-field-type">{type}</div>
      </div>
      <div className="supabase-field-input opacity-80">{value}</div>
    </div>
  );
}

function EditableFieldRow({
  field,
  value,
  editingJson,
  onChange,
  onToggleJsonEdit,
}: {
  field: PropertyFieldDefinition;
  value: unknown;
  editingJson: boolean;
  onChange: (value: unknown) => void;
  onToggleJsonEdit: () => void;
}) {
  const json = isJsonField(field, value);

  return (
    <div className="supabase-field-row">
      <div>
        <div className="supabase-field-label">{field.key}</div>
        <div className="supabase-field-type">{supabaseTypeLabel(field)}</div>
      </div>
      {json && !editingJson ? (
        <div className="supabase-field-input supabase-json-preview">
          <div className="supabase-json-value">
            {formatTableCell(value)}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 shrink-0 border-[var(--sb-border-strong)] bg-transparent text-xs text-[var(--sb-text)]"
            onClick={onToggleJsonEdit}
          >
            <PencilSimpleIcon className="mr-1 size-3.5" />
            Edit
          </Button>
        </div>
      ) : (
        <div className={cn("supabase-field-input", json && editingJson && "pb-2")}>
          {json && editingJson ? (
            <>
              <textarea
                defaultValue={JSON.stringify(value ?? null, null, 2)}
                rows={5}
                onBlur={(event) => {
                  try {
                    const parsed = JSON.parse(event.target.value) as unknown;
                    onChange(parsed);
                    onToggleJsonEdit();
                  } catch {
                    /* keep editing on invalid JSON */
                  }
                }}
              />
              <div className="mt-2 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={onToggleJsonEdit}
                >
                  Done
                </Button>
              </div>
            </>
          ) : (
            <PropertyFieldEditor
              field={field}
              value={value}
              variant="supabase"
              onChange={onChange}
            />
          )}
        </div>
      )}
    </div>
  );
}
