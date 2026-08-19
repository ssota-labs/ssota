"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type {
  ActionCatalogRow,
  EdgeCatalogRow,
  NodeCatalogRow,
  PropertySchemaDefinition,
} from "@ssota/contracts";
import type { WorkerIndex } from "@ssota/contracts";
import { Button } from "@ssota/ui/components/ui/button";
import { Checkbox } from "@ssota/ui/components/ui/checkbox";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@ssota/ui/components/ui/native-select";
import { Switch } from "@ssota/ui/components/ui/switch";
import { Textarea } from "@ssota/ui/components/ui/textarea";
import {
  PropertySchemaBuilder,
  rowsToSchema,
  schemaToRows,
  type FieldRow,
} from "./property-schema-builder";

/**
 * Ontology 편집 폼 3종 — Object type(L1 node) · Link type(L1 edge) · Action(L2).
 * 정의는 서버 액션이 contracts Zod로 파싱하며 오류 문자열을 그대로 보여준다.
 * Function(L3 worker)은 Workers 페이지가 편집 정본이므로 여기선 목록·링크만.
 */

type SaveResult<T> = { ok: true; value: T } | { ok: false; error: string };

function FormRow({ label, htmlFor, children, hint }: { label: string; htmlFor?: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] items-start gap-x-3 gap-y-1">
      <Label htmlFor={htmlFor} className="pt-1.5 text-xs text-muted-foreground">{label}</Label>
      <div className="min-w-0 space-y-1">
        {children}
        {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}

function FormFooter({
  pending,
  error,
  onDelete,
  isNew,
  saveLabel = "Save",
}: {
  pending: boolean;
  error: string | null;
  onDelete?: () => void;
  isNew: boolean;
  saveLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t pt-3">
      <p className="text-xs text-destructive" role={error ? "alert" : undefined}>{error}</p>
      <div className="flex items-center gap-2">
        {!isNew && onDelete ? (
          <Button type="button" variant="ghost" size="sm" onClick={onDelete} disabled={pending}>Delete</Button>
        ) : null}
        <Button type="submit" size="sm" disabled={pending}>{pending ? "Saving…" : saveLabel}</Button>
      </div>
    </div>
  );
}

/** 스키마 최종값 — JSON 모드 원문이 유효하면 그것, 아니면 rows. */
function resolveSchema(rows: FieldRow[], json: string, jsonMode: boolean): PropertySchemaDefinition {
  if (jsonMode) {
    try {
      return JSON.parse(json) as PropertySchemaDefinition;
    } catch {
      /* fall through */
    }
  }
  return rowsToSchema(rows);
}

/* ---------------------------------- Object type ---------------------------------- */

export function ObjectTypeForm({
  initial,
  onSave,
  onDelete,
  onSaved,
}: {
  initial: NodeCatalogRow | null;
  onSave: (input: unknown) => Promise<SaveResult<NodeCatalogRow>>;
  onDelete: (id: string) => Promise<SaveResult<null>>;
  onSaved: (row: NodeCatalogRow | null) => void;
}) {
  const [key, setKey] = useState(initial?.key ?? "");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [keywords, setKeywords] = useState((initial?.keywords ?? []).join(", "));
  const [rows, setRows] = useState<FieldRow[]>(() => schemaToRows(initial?.propertySchema as PropertySchemaDefinition | undefined));
  const [json, setJson] = useState("");
  const [jsonTouched, setJsonTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    setKey(initial?.key ?? "");
    setLabel(initial?.label ?? "");
    setDescription(initial?.description ?? "");
    setKeywords((initial?.keywords ?? []).join(", "));
    setRows(schemaToRows(initial?.propertySchema as PropertySchemaDefinition | undefined));
    setJson("");
    setJsonTouched(false);
    setError(null);
  }, [initial]);

  return (
    <form
      className="space-y-3"
      data-testid="object-type-form"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await onSave({
            id: initial?.id,
            key: key.trim(),
            label: label.trim(),
            description,
            keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
            propertySchema: resolveSchema(rows, json, jsonTouched),
          });
          if (res.ok) onSaved(res.value);
          else setError(res.error);
        });
      }}
    >
      <FormRow label="Key" htmlFor="ot-key" hint="snake_case, unique in the organization (e.g. finance.account)">
        <Input id="ot-key" value={key} onChange={(e) => setKey(e.target.value)} className="h-8 font-mono text-xs" disabled={!!initial} required />
      </FormRow>
      <FormRow label="Label" htmlFor="ot-label">
        <Input id="ot-label" value={label} onChange={(e) => setLabel(e.target.value)} className="h-8 text-sm" required />
      </FormRow>
      <FormRow label="Description" htmlFor="ot-desc">
        <Textarea id="ot-desc" value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-14 text-sm" />
      </FormRow>
      <FormRow label="Keywords" htmlFor="ot-kw" hint="comma-separated search aliases">
        <Input id="ot-kw" value={keywords} onChange={(e) => setKeywords(e.target.value)} className="h-8 text-sm" />
      </FormRow>
      <PropertySchemaBuilder
        rows={rows}
        onChange={setRows}
        json={json}
        onJsonChange={(v) => { setJson(v); setJsonTouched(true); }}
      />
      <FormFooter
        pending={pending}
        error={error}
        isNew={!initial}
        onDelete={initial ? () => {
          if (!confirm(`Delete object type "${initial.label}"? Instances of this type will fail to load.`)) return;
          start(async () => {
            const res = await onDelete(initial.id);
            if (res.ok) onSaved(null);
            else setError(res.error);
          });
        } : undefined}
      />
    </form>
  );
}

/* ----------------------------------- Link type ----------------------------------- */

function TypeMultiSelect({
  options,
  value,
  onChange,
  label,
}: {
  options: NodeCatalogRow[];
  value: string[];
  onChange: (ids: string[]) => void;
  label: string;
}) {
  const set = useMemo(() => new Set(value), [value]);
  return (
    <div className="max-h-32 space-y-0.5 overflow-y-auto rounded-md border p-1.5" role="group" aria-label={label}>
      {options.length === 0 ? <p className="px-1 text-xs text-muted-foreground">No object types yet</p> : null}
      {options.map((o) => (
        <label key={o.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-xs hover:bg-muted">
          <Checkbox
            checked={set.has(o.id)}
            onCheckedChange={(v) => onChange(v === true ? [...value, o.id] : value.filter((id) => id !== o.id))}
          />
          <span className="truncate">{o.label}</span>
          <span className="ml-auto truncate font-mono text-[10px] text-muted-foreground">{o.key}</span>
        </label>
      ))}
    </div>
  );
}

export function LinkTypeForm({
  initial,
  nodeTypes,
  onSave,
  onDelete,
  onSaved,
}: {
  initial: EdgeCatalogRow | null;
  nodeTypes: NodeCatalogRow[];
  onSave: (input: unknown) => Promise<SaveResult<EdgeCatalogRow>>;
  onDelete: (id: string) => Promise<SaveResult<null>>;
  onSaved: (row: EdgeCatalogRow | null) => void;
}) {
  const [key, setKey] = useState(initial?.key ?? "");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [domain, setDomain] = useState<string[]>(initial?.domainCatalogIds ?? []);
  const [range, setRange] = useState<string[]>(initial?.rangeCatalogIds ?? []);
  const [rows, setRows] = useState<FieldRow[]>(() => schemaToRows(initial?.propertySchema as PropertySchemaDefinition | null | undefined));
  const [json, setJson] = useState("");
  const [jsonTouched, setJsonTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    setKey(initial?.key ?? "");
    setLabel(initial?.label ?? "");
    setDescription(initial?.description ?? "");
    setDomain(initial?.domainCatalogIds ?? []);
    setRange(initial?.rangeCatalogIds ?? []);
    setRows(schemaToRows(initial?.propertySchema as PropertySchemaDefinition | null | undefined));
    setJson("");
    setJsonTouched(false);
    setError(null);
  }, [initial]);

  return (
    <form
      className="space-y-3"
      data-testid="link-type-form"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const schema = resolveSchema(rows, json, jsonTouched);
          const res = await onSave({
            id: initial?.id,
            key: key.trim(),
            label: label.trim(),
            description,
            keywords: [],
            domainCatalogIds: domain,
            rangeCatalogIds: range,
            propertySchema: schema.properties ? schema : null,
          });
          if (res.ok) onSaved(res.value);
          else setError(res.error);
        });
      }}
    >
      <FormRow label="Key" htmlFor="lt-key" hint="e.g. finance.journal_entry.posts_to">
        <Input id="lt-key" value={key} onChange={(e) => setKey(e.target.value)} className="h-8 font-mono text-xs" disabled={!!initial} required />
      </FormRow>
      <FormRow label="Label" htmlFor="lt-label">
        <Input id="lt-label" value={label} onChange={(e) => setLabel(e.target.value)} className="h-8 text-sm" required />
      </FormRow>
      <FormRow label="Description" htmlFor="lt-desc">
        <Textarea id="lt-desc" value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-14 text-sm" />
      </FormRow>
      <FormRow label="Domain (from)" hint="empty = any object type">
        <TypeMultiSelect options={nodeTypes} value={domain} onChange={setDomain} label="Domain types" />
      </FormRow>
      <FormRow label="Range (to)" hint="empty = any object type">
        <TypeMultiSelect options={nodeTypes} value={range} onChange={setRange} label="Range types" />
      </FormRow>
      <PropertySchemaBuilder
        rows={rows}
        onChange={setRows}
        json={json}
        onJsonChange={(v) => { setJson(v); setJsonTouched(true); }}
        label="Link properties"
      />
      <FormFooter
        pending={pending}
        error={error}
        isNew={!initial}
        onDelete={initial ? () => {
          if (!confirm(`Delete link type "${initial.label}"?`)) return;
          start(async () => {
            const res = await onDelete(initial.id);
            if (res.ok) onSaved(null);
            else setError(res.error);
          });
        } : undefined}
      />
    </form>
  );
}

/* ------------------------------------ Action ------------------------------------ */

const DECLARATIVE_EXAMPLE = `[
  {
    "op": "create_node",
    "ref": "entry",
    "catalogKey": "finance.journal_entry",
    "title": { "$param": "entryNo" },
    "properties": { "entryNo": { "$param": "entryNo" }, "status": "posted" }
  }
]`;

export function ActionTypeForm({
  initial,
  nodeTypes,
  edgeTypes,
  workers,
  onSave,
  onDelete,
  onSaved,
}: {
  initial: ActionCatalogRow | null;
  nodeTypes: NodeCatalogRow[];
  edgeTypes: EdgeCatalogRow[];
  workers: WorkerIndex[];
  onSave: (input: unknown) => Promise<SaveResult<ActionCatalogRow>>;
  onDelete: (key: string) => Promise<SaveResult<null>>;
  onSaved: (row: ActionCatalogRow | null) => void;
}) {
  const [key, setKey] = useState(initial?.key ?? "");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [rows, setRows] = useState<FieldRow[]>(() => schemaToRows(initial?.parameters));
  const [json, setJson] = useState("");
  const [jsonTouched, setJsonTouched] = useState(false);
  const [writes, setWrites] = useState<string[]>(initial?.writes ?? []);
  const [ownerOnly, setOwnerOnly] = useState((initial?.requires.roles ?? []).includes("owner"));
  const [gate, setGate] = useState(initial?.gate ?? false);
  const [kind, setKind] = useState<"declarative" | "function">(initial?.edits.kind ?? "declarative");
  const [editsJson, setEditsJson] = useState(
    initial?.edits.kind === "declarative" ? JSON.stringify(initial.edits.edits, null, 2) : DECLARATIVE_EXAMPLE,
  );
  const [workerKey, setWorkerKey] = useState(initial?.edits.kind === "function" ? initial.edits.workerKey : "");
  const [aggregateRootParam, setAggregateRootParam] = useState(initial?.aggregateRootParam ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    setKey(initial?.key ?? "");
    setLabel(initial?.label ?? "");
    setDescription(initial?.description ?? "");
    setRows(schemaToRows(initial?.parameters));
    setJson("");
    setJsonTouched(false);
    setWrites(initial?.writes ?? []);
    setOwnerOnly((initial?.requires.roles ?? []).includes("owner"));
    setGate(initial?.gate ?? false);
    setKind(initial?.edits.kind ?? "declarative");
    setEditsJson(initial?.edits.kind === "declarative" ? JSON.stringify(initial.edits.edits, null, 2) : DECLARATIVE_EXAMPLE);
    setWorkerKey(initial?.edits.kind === "function" ? initial.edits.workerKey : "");
    setAggregateRootParam(initial?.aggregateRootParam ?? "");
    setError(null);
  }, [initial]);

  const catalogKeys = useMemo(
    () => [...nodeTypes.map((n) => ({ key: n.key, label: n.label, kind: "object" })), ...edgeTypes.map((e) => ({ key: e.key, label: e.label, kind: "link" }))],
    [nodeTypes, edgeTypes],
  );
  const writesSet = useMemo(() => new Set(writes), [writes]);
  const paramNames = rows.map((r) => r.name.trim()).filter(Boolean);

  return (
    <form
      className="space-y-3"
      data-testid="action-type-form"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        let edits: unknown;
        if (kind === "declarative") {
          try {
            edits = { kind: "declarative", edits: JSON.parse(editsJson) };
          } catch (err) {
            setError(`edits JSON: ${err instanceof Error ? err.message : String(err)}`);
            return;
          }
        } else {
          edits = { kind: "function", workerKey };
        }
        start(async () => {
          const res = await onSave({
            id: initial?.id,
            key: key.trim(),
            label: label.trim(),
            description,
            parameters: resolveSchema(rows, json, jsonTouched),
            writes,
            requires: { roles: ownerOnly ? ["owner"] : [] },
            criteria: initial?.criteria ?? [],
            gate,
            edits,
            aggregateRootParam: aggregateRootParam || undefined,
          });
          if (res.ok) onSaved(res.value);
          else setError(res.error);
        });
      }}
    >
      <FormRow label="Key" htmlFor="at-key" hint="<domain>.<verb>, e.g. finance.post_journal_entry">
        <Input id="at-key" value={key} onChange={(e) => setKey(e.target.value)} className="h-8 font-mono text-xs" disabled={!!initial} required />
      </FormRow>
      <FormRow label="Label" htmlFor="at-label">
        <Input id="at-label" value={label} onChange={(e) => setLabel(e.target.value)} className="h-8 text-sm" required />
      </FormRow>
      <FormRow label="Description" htmlFor="at-desc">
        <Textarea id="at-desc" value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-14 text-sm" />
      </FormRow>
      <PropertySchemaBuilder
        rows={rows}
        onChange={setRows}
        json={json}
        onJsonChange={(v) => { setJson(v); setJsonTouched(true); }}
        label="Parameters"
        testId="action-parameters-builder"
      />
      <FormRow label="Writes" hint="catalog keys this action may touch — edits outside this set are rejected">
        <div className="flex max-h-32 flex-wrap gap-1 overflow-y-auto rounded-md border p-1.5" role="group" aria-label="Writes">
          {catalogKeys.length === 0 ? <p className="px-1 text-xs text-muted-foreground">Define object/link types first</p> : null}
          {catalogKeys.map((c) => (
            <label key={c.key} className={`flex cursor-pointer items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] ${writesSet.has(c.key) ? "border-primary bg-primary/10" : "text-muted-foreground"}`}>
              <Checkbox
                className="size-3"
                checked={writesSet.has(c.key)}
                onCheckedChange={(v) => setWrites(v === true ? [...writes, c.key] : writes.filter((k) => k !== c.key))}
              />
              <span className="font-mono">{c.key}</span>
            </label>
          ))}
        </div>
      </FormRow>
      <FormRow label="Permission">
        <label className="flex items-center gap-2 text-xs">
          <Switch checked={ownerOnly} onCheckedChange={setOwnerOnly} aria-label="Owner only" />
          {ownerOnly ? "Owners only" : "Any org member"}
        </label>
      </FormRow>
      <FormRow label="Gate" hint="when on, the commit waits for a human approval task">
        <label className="flex items-center gap-2 text-xs">
          <Switch checked={gate} onCheckedChange={setGate} aria-label="Gate" />
          {gate ? "Approval required" : "Commits immediately"}
        </label>
      </FormRow>
      <FormRow label="Edits">
        <div className="space-y-2">
          <NativeSelect value={kind} onChange={(e) => setKind(e.target.value as "declarative" | "function")} className="h-8 w-56 text-xs" aria-label="Edits kind">
            <NativeSelectOption value="declarative">Declarative template (L2)</NativeSelectOption>
            <NativeSelectOption value="function">Function / worker (L3)</NativeSelectOption>
          </NativeSelect>
          {kind === "declarative" ? (
            <>
              <Textarea
                value={editsJson}
                onChange={(e) => setEditsJson(e.target.value)}
                className="min-h-44 font-mono text-xs"
                spellCheck={false}
                aria-label="Declarative edits JSON"
              />
              <p className="text-[11px] text-muted-foreground">
                GraphEdits ops (create_node · update_properties · create_edge · delete_edge · delete_node · set_status · assert · assert_count).
                Use {"{ \"$param\": \"name\" }"} for parameters{paramNames.length ? `: ${paramNames.join(", ")}` : ""}.
              </p>
            </>
          ) : (
            <NativeSelect value={workerKey} onChange={(e) => setWorkerKey(e.target.value)} className="h-8 w-full text-xs" aria-label="Worker" required>
              <NativeSelectOption value="">Select a worker…</NativeSelectOption>
              {workers.map((w) => (
                <NativeSelectOption key={w.id} value={w.key}>{w.name} ({w.key})</NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </div>
      </FormRow>
      <FormRow label="Lock root" htmlFor="at-root" hint="parameter holding the aggregate-root node id to lock (FOR UPDATE)">
        <NativeSelect id="at-root" value={aggregateRootParam} onChange={(e) => setAggregateRootParam(e.target.value)} className="h-8 w-56 text-xs">
          <NativeSelectOption value="">— none —</NativeSelectOption>
          {paramNames.map((p) => (
            <NativeSelectOption key={p} value={p}>{p}</NativeSelectOption>
          ))}
        </NativeSelect>
      </FormRow>
      <FormFooter
        pending={pending}
        error={error}
        isNew={!initial}
        onDelete={initial ? () => {
          if (!confirm(`Delete action "${initial.label}"?`)) return;
          start(async () => {
            const res = await onDelete(initial.key);
            if (res.ok) onSaved(null);
            else setError(res.error);
          });
        } : undefined}
      />
    </form>
  );
}
