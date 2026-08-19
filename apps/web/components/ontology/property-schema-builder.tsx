"use client";

import { useMemo, useState } from "react";
import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
import type { PropertyFieldSchema, PropertySchemaDefinition } from "@ssota/contracts";
import { Button } from "@ssota/ui/components/ui/button";
import { Checkbox } from "@ssota/ui/components/ui/checkbox";
import { Input } from "@ssota/ui/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@ssota/ui/components/ui/native-select";
import { Textarea } from "@ssota/ui/components/ui/textarea";
import { cn } from "@ssota/ui/lib/utils";

/**
 * property_schema 필드 빌더 — 닫힌 JSON Schema 서브셋(contracts property-schema)을
 * 행 단위 폼으로 편집한다. 어휘: type·required·enum·format·min/max·description.
 * 중첩(object/array items)은 "JSON" 모드로만 편집한다 — 표는 1단계 필드에 집중한다.
 */

export type FieldType = PropertyFieldSchema["type"];
export type FieldFormat = NonNullable<PropertyFieldSchema["format"]>;

export interface FieldRow {
  name: string;
  type: FieldType;
  required: boolean;
  description: string;
  enumText: string;
  format: FieldFormat | "";
  min: string;
  max: string;
  /** 중첩 스키마(object/array)는 원본을 보존한다 */
  nested?: Pick<PropertyFieldSchema, "items" | "properties" | "required">;
}

const TYPES: FieldType[] = ["string", "integer", "number", "boolean", "array", "object"];
const FORMATS: FieldFormat[] = ["date", "date-time", "uuid", "email", "uri"];

export function schemaToRows(schema: PropertySchemaDefinition | null | undefined): FieldRow[] {
  if (!schema?.properties) return [];
  const required = new Set(schema.required ?? []);
  return Object.entries(schema.properties).map<FieldRow>(([name, f]) => ({
    name,
    type: f.type,
    required: required.has(name),
    description: f.description ?? "",
    enumText: f.enum ? f.enum.join(", ") : "",
    format: f.format ?? "",
    min: String(f.minimum ?? f.minLength ?? ""),
    max: String(f.maximum ?? f.maxLength ?? ""),
    nested:
      f.type === "array" || f.type === "object"
        ? { items: f.items, properties: f.properties, required: f.required }
        : undefined,
  }));
}

export function rowsToSchema(rows: FieldRow[]): PropertySchemaDefinition {
  const properties: Record<string, PropertyFieldSchema> = {};
  const required: string[] = [];
  for (const r of rows) {
    const name = r.name.trim();
    if (!name) continue;
    const f: PropertyFieldSchema = { type: r.type };
    if (r.description.trim()) f.description = r.description.trim();
    if (r.enumText.trim()) {
      const values = r.enumText.split(",").map((v) => v.trim()).filter(Boolean);
      f.enum = r.type === "number" || r.type === "integer" ? values.map(Number) : values;
    }
    if (r.type === "string") {
      if (r.format) f.format = r.format;
      if (r.min !== "") f.minLength = Number(r.min);
      if (r.max !== "") f.maxLength = Number(r.max);
    }
    if (r.type === "number" || r.type === "integer") {
      if (r.min !== "") f.minimum = Number(r.min);
      if (r.max !== "") f.maximum = Number(r.max);
    }
    if (r.nested) {
      if (r.type === "array" && r.nested.items) f.items = r.nested.items;
      if (r.type === "object") {
        if (r.nested.properties) f.properties = r.nested.properties;
        if (r.nested.required) f.required = r.nested.required;
      }
    }
    properties[name] = f;
    if (r.required) required.push(name);
  }
  const out: PropertySchemaDefinition = { type: "object" };
  if (Object.keys(properties).length) out.properties = properties;
  if (required.length) out.required = required;
  return out;
}

export function emptyRow(): FieldRow {
  return { name: "", type: "string", required: false, description: "", enumText: "", format: "", min: "", max: "" };
}

export function PropertySchemaBuilder({
  rows,
  onChange,
  json,
  onJsonChange,
  label = "Properties",
  testId = "property-schema-builder",
}: {
  rows: FieldRow[];
  onChange: (rows: FieldRow[]) => void;
  /** JSON 모드의 원문 — 부모가 최종 스키마를 결정한다 (JSON 우선). */
  json: string;
  onJsonChange: (json: string) => void;
  label?: string;
  testId?: string;
}) {
  const [mode, setMode] = useState<"fields" | "json">("fields");
  const jsonError = useMemo(() => {
    if (mode !== "json") return null;
    try {
      JSON.parse(json);
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : "invalid JSON";
    }
  }, [json, mode]);

  const update = (i: number, patch: Partial<FieldRow>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-2" data-testid={testId}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1 text-xs">
          <button
            type="button"
            className={cn("rounded px-1.5 py-0.5", mode === "fields" ? "bg-muted font-medium" : "text-muted-foreground")}
            onClick={() => {
              if (mode === "json" && !jsonError) {
                try {
                  onChange(schemaToRows(JSON.parse(json) as PropertySchemaDefinition));
                } catch {
                  /* keep rows */
                }
              }
              setMode("fields");
            }}
          >
            Fields
          </button>
          <button
            type="button"
            className={cn("rounded px-1.5 py-0.5", mode === "json" ? "bg-muted font-medium" : "text-muted-foreground")}
            onClick={() => {
              onJsonChange(JSON.stringify(rowsToSchema(rows), null, 2));
              setMode("json");
            }}
          >
            JSON
          </button>
        </div>
      </div>

      {mode === "json" ? (
        <div className="space-y-1">
          <Textarea
            value={json}
            onChange={(e) => onJsonChange(e.target.value)}
            className="min-h-40 font-mono text-xs"
            spellCheck={false}
            aria-label={`${label} JSON`}
          />
          {jsonError ? <p className="text-xs text-destructive">{jsonError}</p> : null}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr className="[&>th]:px-2 [&>th]:py-1 [&>th]:text-left [&>th]:font-medium">
                <th className="w-40">Name</th>
                <th className="w-24">Type</th>
                <th className="w-10 text-center">Req</th>
                <th className="w-24">Format</th>
                <th>Enum (a, b, c)</th>
                <th className="w-16">Min</th>
                <th className="w-16">Max</th>
                <th>Description</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-2 py-3 text-center text-muted-foreground">
                    No fields — any object is accepted.
                  </td>
                </tr>
              ) : null}
              {rows.map((r, i) => (
                <tr key={i} className="border-t [&>td]:px-1 [&>td]:py-0.5" data-testid="property-field-row">
                  <td>
                    <Input
                      value={r.name}
                      onChange={(e) => update(i, { name: e.target.value })}
                      placeholder="field_name"
                      className="h-7 font-mono text-xs"
                      aria-label="Field name"
                    />
                  </td>
                  <td>
                    <NativeSelect
                      value={r.type}
                      onChange={(e) => update(i, { type: e.target.value as FieldType })}
                      className="h-7 text-xs"
                      aria-label="Field type"
                    >
                      {TYPES.map((t) => (
                        <NativeSelectOption key={t} value={t}>{t}</NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </td>
                  <td className="text-center">
                    <Checkbox
                      checked={r.required}
                      onCheckedChange={(v) => update(i, { required: v === true })}
                      aria-label="Required"
                    />
                  </td>
                  <td>
                    <NativeSelect
                      value={r.format}
                      onChange={(e) => update(i, { format: e.target.value as FieldFormat | "" })}
                      className="h-7 text-xs"
                      disabled={r.type !== "string"}
                      aria-label="Format"
                    >
                      <NativeSelectOption value="">—</NativeSelectOption>
                      {FORMATS.map((f) => (
                        <NativeSelectOption key={f} value={f}>{f}</NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </td>
                  <td>
                    <Input
                      value={r.enumText}
                      onChange={(e) => update(i, { enumText: e.target.value })}
                      className="h-7 text-xs"
                      disabled={r.type === "boolean" || r.type === "array" || r.type === "object"}
                      aria-label="Enum"
                    />
                  </td>
                  <td>
                    <Input value={r.min} onChange={(e) => update(i, { min: e.target.value })} className="h-7 text-xs" inputMode="numeric" aria-label="Min" disabled={r.type === "boolean" || r.type === "array" || r.type === "object"} />
                  </td>
                  <td>
                    <Input value={r.max} onChange={(e) => update(i, { max: e.target.value })} className="h-7 text-xs" inputMode="numeric" aria-label="Max" disabled={r.type === "boolean" || r.type === "array" || r.type === "object"} />
                  </td>
                  <td>
                    <Input value={r.description} onChange={(e) => update(i, { description: e.target.value })} className="h-7 text-xs" aria-label="Description" />
                  </td>
                  <td>
                    <Button type="button" variant="ghost" size="icon-xs" aria-label="Remove field" onClick={() => onChange(rows.filter((_, idx) => idx !== i))}>
                      <TrashIcon />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {mode === "fields" ? (
        <Button type="button" variant="outline" size="xs" onClick={() => onChange([...rows, emptyRow()])}>
          <PlusIcon /> Add field
        </Button>
      ) : null}
    </div>
  );
}
