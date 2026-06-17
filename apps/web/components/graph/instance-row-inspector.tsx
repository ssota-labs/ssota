"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { PencilSimpleIcon } from "@phosphor-icons/react";
import {
  updateNodeContentDocAction,
  updateNodePropertiesBatchFormAction,
} from "@/app/actions";
import { PropertyFieldEditor } from "@/components/graph/property-field-editor";
import {
  GraphFlowCanvas,
  type GraphFlowEdge,
  type GraphFlowNode,
} from "@/components/graph/graph-flow-canvas";
import type { InstanceGraphRelation } from "@/components/graph/node-instances-view.types";
import { Button } from "@ssota/ui/components/ui/button";
import { Textarea } from "@ssota/ui/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@ssota/ui/components/ui/tabs";
import {
  fieldTypeLabel,
  isJsonField,
  type PropertyFieldDefinition,
} from "@/lib/graph/property-field-types";
import { formatTableCell } from "@/lib/graph/format-table-cell";
import {
  isTiptapDoc,
  plainTextToTiptapDoc,
  SsotaEditor,
  type JSONContent,
} from "@ssota/editor";
import "@ssota/editor/styles.css";

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
  const [bodyDoc, setBodyDoc] = useState<JSONContent>(() =>
    isTiptapDoc(properties.contentDoc)
      ? properties.contentDoc
      : plainTextToTiptapDoc(content),
  );
  const [bodySaveState, setBodySaveState] = useState<
    "saved" | "unsaved" | "saving" | "failed"
  >("saved");
  const [bodySaveError, setBodySaveError] = useState<string | null>(null);
  const [editingJsonKey, setEditingJsonKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<"fields" | "relations">("fields");

  const editableFields = useMemo(
    () => fields.filter((field) => field.key !== "contentDoc"),
    [fields],
  );

  const changedProperties = useMemo(() => {
    const diff: Record<string, unknown> = {};
    for (const field of editableFields) {
      const before = properties[field.key];
      const after = draft[field.key];
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        diff[field.key] = after;
      }
    }
    return diff;
  }, [draft, editableFields, properties]);

  const hasChanges = Object.keys(changedProperties).length > 0;

  const updateBodyDoc = useCallback((doc: JSONContent) => {
    setBodyDoc(doc);
    setBodySaveState("unsaved");
    setBodySaveError(null);
  }, []);

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

  useEffect(() => {
    const serialized = JSON.stringify(bodyDoc);
    const persisted = isTiptapDoc(properties.contentDoc)
      ? JSON.stringify(properties.contentDoc)
      : JSON.stringify(plainTextToTiptapDoc(content));

    if (serialized === persisted) {
      return;
    }

    const timeout = window.setTimeout(async () => {
      setBodySaveState("saving");
      const result = await updateNodeContentDocAction({
        projectId,
        nodeSlug,
        nodeId,
        doc: bodyDoc,
      });

      if (!result.ok) {
        setBodySaveState("failed");
        setBodySaveError(result.error ?? "Failed to save body");
        return;
      }

      const merged = { ...properties, contentDoc: bodyDoc };
      setDraft((current) => ({ ...current, contentDoc: bodyDoc }));
      onUpdated(merged);
      setBodySaveState("saved");
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [bodyDoc, content, nodeId, nodeSlug, onUpdated, projectId, properties]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="shrink-0 border-b px-6 py-4 pr-14">
        <h2 className="text-sm font-medium">
          Update row from <span className="font-semibold">{nodeTypeLabel}</span>
        </h2>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as "fields" | "relations")}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <div className="shrink-0 border-b px-6 py-1">
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
          <BodyEditorField
            saveState={bodySaveState}
            error={bodySaveError}
            doc={bodyDoc}
            onChange={updateBodyDoc}
          />
          {editableFields.map((field) => (
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
          {content ? (
            <ReadOnlyTextField label="content" type="legacy text" value={content} />
          ) : null}
          <ReadOnlyField label="updated_at" type="timestamptz" value={updatedAt} />
        </TabsContent>

        <TabsContent value="relations" className="min-h-0 flex-1 p-6">
          <GraphFlowCanvas
            nodes={flow.nodes}
            edges={flow.edges}
            emptyMessage="This instance has no loaded graph relationships yet."
          />
        </TabsContent>
      </Tabs>

      {error ? (
        <div className="shrink-0 border-t border-destructive/30 bg-destructive/5 px-6 py-2 text-xs text-destructive">
          {error}
        </div>
      ) : null}

      <div className="shrink-0 flex items-center justify-end gap-2 border-t bg-background px-6 py-3">
        <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button
          type="button"
          disabled={!hasChanges || isPending}
          onClick={queueChanges}
        >
          {isPending ? "Saving…" : "Queue changes"}
          <span className="ml-2 text-[10px] opacity-70">⌘↵</span>
        </Button>
      </div>
    </div>
  );
}

function BodyEditorField({
  saveState,
  error,
  doc,
  onChange,
}: {
  saveState: "saved" | "unsaved" | "saving" | "failed";
  error: string | null;
  doc: JSONContent;
  onChange: (doc: JSONContent) => void;
}) {
  const label =
    saveState === "saving"
      ? "Saving"
      : saveState === "unsaved"
        ? "Unsaved"
        : saveState === "failed"
          ? "Failed"
          : "Saved";

  return (
    <div className="instance-field-row items-start">
      <FieldMeta label="body" type="contentDoc" />
      <div className="instance-field-value min-w-0">
        <div
          className="rounded-md border bg-background px-4 py-3"
          data-testid="node-body-editor"
        >
          <SsotaEditor
            content={doc}
            onChange={onChange}
            placeholder="내용을 입력하거나 / 를 눌러 블록을 추가하세요"
          />
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className={
              saveState === "failed"
                ? "text-destructive"
                : saveState === "saved"
                  ? "text-emerald-600"
                  : ""
            }
          >
            {label}
          </span>
          {error ? <span className="text-destructive">{error}</span> : null}
        </div>
      </div>
    </div>
  );
}

function ReadOnlyTextField({
  label,
  type,
  value,
}: {
  label: string;
  type: string;
  value: string;
}) {
  return (
    <div className="instance-field-row">
      <FieldMeta label={label} type={type} />
      <div className="instance-field-value">
        <Textarea
          readOnly
          rows={3}
          value={value}
          className="min-h-16 resize-y font-mono text-muted-foreground"
        />
      </div>
    </div>
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
    <div className="instance-field-row">
      <FieldMeta label={label} type={type} />
      <div className="min-w-0 py-1.5 font-mono text-sm text-muted-foreground">{value}</div>
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
    <div className="instance-field-row">
      <FieldMeta label={field.key} type={fieldTypeLabel(field)} />
      {json && !editingJson ? (
        <div className="instance-field-value flex items-start gap-3">
          <Textarea
            readOnly
            rows={3}
            value={formatTableCell(value)}
            className="min-h-16 flex-1 resize-y font-mono"
          />
          <Button type="button" variant="outline" size="sm" className="h-7 shrink-0" onClick={onToggleJsonEdit}>
            <PencilSimpleIcon className="mr-1 size-3.5" />
            Edit
          </Button>
        </div>
      ) : json && editingJson ? (
        <div className="instance-field-value space-y-2">
          <Textarea
            className="min-h-28 resize-y font-mono"
            defaultValue={JSON.stringify(value ?? null, null, 2)}
            rows={6}
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
          <div className="flex justify-end">
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={onToggleJsonEdit}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <div className="instance-field-value">
          <PropertyFieldEditor field={field} value={value} onChange={onChange} />
        </div>
      )}
    </div>
  );
}

function FieldMeta({ label, type }: { label: string; type: string }) {
  return (
    <div className="pt-0.5">
      <div className="text-sm font-medium text-foreground">{label}</div>
      <div className="mt-0.5 font-mono text-[11px] lowercase text-muted-foreground">{type}</div>
    </div>
  );
}
