"use client";

import { useMemo, useState, useTransition } from "react";
import type { ActionCatalogRow, PropertyFieldSchema } from "@ssota/contracts";
import { Button } from "@ssota/ui/components/ui/button";
import { Checkbox } from "@ssota/ui/components/ui/checkbox";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@ssota/ui/components/ui/native-select";
import { Textarea } from "@ssota/ui/components/ui/textarea";

/**
 * Generic action form — 액션의 `parameters`(닫힌 JSON Schema 서브셋)에서 폼을 만든다.
 *
 * [GRAPH-08] 예외(ADR-aip-console-concepts): 액션은 런타임 정의라 페이지마다 typed
 * 컴포넌트를 둘 수 없다. 어휘가 닫혀 있으므로 렌더러도 닫힌 case 분석 하나로 끝난다.
 *
 * uuid 형식 파라미터는 같은 프로젝트의 노드 선택기로 바꿔 준다 — 회계 전표에서 계정을
 * 고르는 것이 uuid를 손으로 붙여넣는 것보다 실제 사용에 가깝다.
 */

export interface NodeOption {
  id: string;
  title: string;
  catalogKey: string;
  catalogLabel: string;
}

export type RunActionResult =
  | { ok: true; createdNodeIds: string[]; createdEdgeIds: string[] }
  | { ok: false; code: string; error: string };

function defaultValue(field: PropertyFieldSchema): unknown {
  if (field.type === "boolean") return false;
  return "";
}

function coerce(field: PropertyFieldSchema, raw: unknown): unknown {
  if (field.type === "integer" || field.type === "number") {
    if (raw === "" || raw === null || raw === undefined) return undefined;
    return Number(raw);
  }
  if (field.type === "boolean") return Boolean(raw);
  if (raw === "") return undefined;
  return raw;
}

export function ActionForm({
  action,
  nodeOptions,
  paramNodeTypes = {},
  onRun,
  onDone,
}: {
  action: ActionCatalogRow;
  /** uuid 파라미터의 선택 후보 (프로젝트 노드) */
  nodeOptions: NodeOption[];
  /** 파라미터명 → 허용 객체 타입 키 (액션 편집에서 유도). 없으면 전체 노드. */
  paramNodeTypes?: Record<string, string[]>;
  onRun: (parameters: Record<string, unknown>, idempotencyKey: string) => Promise<RunActionResult>;
  onDone?: (result: Extract<RunActionResult, { ok: true }>) => void;
}) {
  const fields = useMemo(
    () => Object.entries(action.parameters.properties ?? {}),
    [action],
  );
  const required = useMemo(() => new Set(action.parameters.required ?? []), [action]);

  const [values, setValues] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(fields.map(([name, f]) => [name, defaultValue(f)])),
  );
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const set = (name: string, v: unknown) => setValues((prev) => ({ ...prev, [name]: v }));

  return (
    <form
      className="space-y-3"
      data-testid="action-form"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setDone(null);
        const parameters: Record<string, unknown> = {};
        for (const [name, field] of fields) {
          const v = coerce(field, values[name]);
          if (v !== undefined) parameters[name] = v;
        }
        start(async () => {
          const res = await onRun(parameters, crypto.randomUUID());
          if (res.ok) {
            setDone(
              `Committed — ${res.createdNodeIds.length} record(s), ${res.createdEdgeIds.length} link(s).`,
            );
            onDone?.(res);
          } else {
            setError(`${res.code}: ${res.error}`);
          }
        });
      }}
    >
      {action.description ? <p className="text-xs text-muted-foreground">{action.description}</p> : null}

      {fields.length === 0 ? (
        <p className="text-xs text-muted-foreground">This action takes no parameters.</p>
      ) : null}

      {fields.map(([name, field]) => {
        const id = `param-${name}`;
        const isRequired = required.has(name);
        const label = `${name}${isRequired ? " *" : ""}`;
        const allowed = paramNodeTypes[name];
        const uuidOptions =
          field.format === "uuid"
            ? allowed?.length
              ? nodeOptions.filter((o) => allowed.includes(o.catalogKey))
              : nodeOptions
            : null;

        return (
          <div key={name} className="grid grid-cols-[9rem_1fr] items-start gap-x-3 gap-y-1">
            <Label htmlFor={id} className="pt-1.5 text-xs text-muted-foreground">{label}</Label>
            <div className="min-w-0 space-y-1">
              {uuidOptions ? (
                <NativeSelect
                  id={id}
                  className="h-8 w-full text-xs"
                  value={String(values[name] ?? "")}
                  onChange={(e) => set(name, e.target.value)}
                  required={isRequired}
                >
                  <NativeSelectOption value="">Select…</NativeSelectOption>
                  {uuidOptions.map((o) => (
                    <NativeSelectOption key={o.id} value={o.id}>
                      {o.title} · {o.catalogLabel}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              ) : field.enum ? (
                <NativeSelect
                  id={id}
                  className="h-8 w-full text-xs"
                  value={String(values[name] ?? "")}
                  onChange={(e) => set(name, e.target.value)}
                  required={isRequired}
                >
                  <NativeSelectOption value="">Select…</NativeSelectOption>
                  {field.enum.map((v) => (
                    <NativeSelectOption key={String(v)} value={String(v)}>{String(v)}</NativeSelectOption>
                  ))}
                </NativeSelect>
              ) : field.type === "boolean" ? (
                <Checkbox
                  id={id}
                  checked={Boolean(values[name])}
                  onCheckedChange={(v) => set(name, v === true)}
                />
              ) : field.type === "object" || field.type === "array" ? (
                <Textarea
                  id={id}
                  className="min-h-20 font-mono text-xs"
                  value={String(values[name] ?? "")}
                  onChange={(e) => set(name, e.target.value)}
                  placeholder="JSON"
                />
              ) : (
                <Input
                  id={id}
                  className="h-8 text-sm"
                  type={
                    field.type === "integer" || field.type === "number"
                      ? "number"
                      : field.format === "date"
                        ? "date"
                        : field.format === "email"
                          ? "email"
                          : "text"
                  }
                  value={String(values[name] ?? "")}
                  onChange={(e) => set(name, e.target.value)}
                  required={isRequired}
                  min={field.minimum}
                  max={field.maximum}
                  minLength={field.minLength}
                  maxLength={field.maxLength}
                />
              )}
              {field.description ? (
                <p className="text-[11px] text-muted-foreground">{field.description}</p>
              ) : null}
            </div>
          </div>
        );
      })}

      <div className="flex items-center justify-between gap-3 border-t pt-3">
        <p className="text-xs" role={error || done ? "alert" : undefined}>
          <span className="text-destructive">{error}</span>
          <span className="text-muted-foreground">{done}</span>
        </p>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Running…" : action.gate ? "Submit for approval" : "Run"}
        </Button>
      </div>
    </form>
  );
}
