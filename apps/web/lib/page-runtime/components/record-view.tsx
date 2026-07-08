"use client";

import { useState } from "react";
import { FileDashedIcon, FileTextIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@ssota/ui/lib/utils";
import { useAction } from "../context";
import { boundNode, boundNodesByKey } from "../bindings";
import { flowColorClasses, type FlowColorToken } from "../flow-tokens";
import type { BindingContext, CatalogComponent, RenderNode } from "../types";

/** A property field inside a section. `type` drives typed value rendering. */
type RecordField = {
  key: string;
  label?: string;
  type?: "text" | "date" | "number" | "badge";
};

/** A grouped block of property fields shown as a definition grid. */
type RecordSection = { title: string; fields: RecordField[] };

/** A related-node group already resolved from a traverse (or query) binding. */
type RecordRelation = { title: string; nodes: RenderNode[] };

/**
 * A header action button. Dispatches `{ nodeId, ...extra }` to an EXISTING action
 * kind (update_node / set_node_property / create_edge / delete_edge / delete_node)
 * — the action wires the payload via `{$input:"nodeId"}` / `{$input:"value"}` etc.
 */
type RecordAction = {
  label: string;
  action?: string;
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  field?: string;
  property?: string;
  value?: unknown;
};

/** Read `"title"` or a node property, domain-agnostic (matches DataTable's readCell). */
function readField(node: RenderNode, key: string): unknown {
  return key === "title"
    ? node.title
    : (node.properties as Record<string, unknown>)?.[key];
}

/** Deterministic, locale-free date format (YYYY-MM-DD) — no hydration drift. */
function formatDate(value: unknown): string {
  if (value == null || value === "") return "";
  const date = new Date(typeof value === "number" ? value : String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().slice(0, 10);
}

/** Humanize a property key ("dueDate"/"due_date" → "Due date") for a fallback label. */
function humanize(key: string): string {
  const spaced = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : key;
}

/**
 * Map a free-text status value onto one of the shared FlowColorToken buckets, so
 * the status chip reuses the allowlisted flow-token class map (R7 / [DS-02]) instead
 * of hardcoding a palette. Domain-agnostic (issue/deal/employee/contract vocab).
 */
function statusToken(status: string): FlowColorToken {
  const s = status.trim().toLowerCase();
  if (
    [
      "approved",
      "approve",
      "done",
      "validated",
      "completed",
      "complete",
      "merged",
      "resolved",
      "closed",
      "accepted",
      "paid",
      "signed",
      "won",
    ].includes(s)
  )
    return "green";
  if (
    [
      "rejected",
      "reject",
      "denied",
      "declined",
      "failed",
      "blocked",
      "cancelled",
      "canceled",
      "overdue",
      "lost",
      "expired",
    ].includes(s)
  )
    return "red";
  if (
    [
      "pending",
      "review",
      "in_review",
      "in-review",
      "waiting",
      "submitted",
      "requested",
      "draft",
      "todo",
      "open",
      "backlog",
    ].includes(s)
  )
    return "amber";
  if (["active", "in_progress", "in-progress", "doing", "processing", "testing"].includes(s))
    return "blue";
  return "gray";
}

function StatusBadge({ status }: { status: string }) {
  const classes = flowColorClasses(statusToken(status));
  return (
    <Badge
      variant="outline"
      className={cn(
        "shrink-0 border capitalize",
        classes.surface,
        classes.border,
        classes.text,
      )}
    >
      {status}
    </Badge>
  );
}

/** Typed rendering of a single property value. */
function FieldValue({ field, value }: { field: RecordField; value: unknown }) {
  if (value == null || value === "") {
    return <span className="text-muted-foreground">—</span>;
  }
  if (field.type === "badge") return <StatusBadge status={String(value)} />;
  if (field.type === "date") {
    return <span className="tabular-nums">{formatDate(value)}</span>;
  }
  if (field.type === "number") {
    return <span className="tabular-nums">{String(value)}</span>;
  }
  return <span className="break-words">{String(value)}</span>;
}

/** A header action: dispatches its action with the subject nodeId + any extras. */
function RecordActionButton({
  subjectId,
  spec,
}: {
  subjectId: string;
  spec: RecordAction;
}) {
  const onAction = useAction();
  const [pending, setPending] = useState(false);
  const disabled = !onAction || !spec.action || pending;

  const dispatch = async () => {
    if (!onAction || !spec.action) return;
    setPending(true);
    try {
      const payload: Record<string, unknown> = { nodeId: subjectId };
      if (spec.field != null) payload.field = spec.field;
      if (spec.property != null) payload.property = spec.property;
      if (spec.value !== undefined) payload.value = spec.value;
      await onAction(spec.action, payload);
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      type="button"
      size="sm"
      variant={spec.variant ?? "outline"}
      disabled={disabled}
      onClick={() => void dispatch()}
    >
      {pending ? <Spinner className="size-3.5" /> : null}
      {spec.label}
    </Button>
  );
}

/** A property section: title + a definition grid of label/value rows. */
function SectionCard({
  subject,
  section,
}: {
  subject: RenderNode;
  section: RecordSection;
}) {
  return (
    <Card className="gap-0 overflow-hidden p-0">
      <h3 className="px-4 py-3 text-sm font-medium">{section.title}</h3>
      <Separator />
      {section.fields.length === 0 ? (
        <p className="text-muted-foreground px-4 py-3 text-sm">필드가 없습니다</p>
      ) : (
        <dl>
          {section.fields.map((f) => (
            <div
              key={f.key}
              className="border-border grid grid-cols-1 gap-1 border-b px-4 py-2.5 last:border-b-0 sm:grid-cols-[minmax(0,180px)_1fr] sm:items-start sm:gap-4"
            >
              <dt className="text-muted-foreground text-xs font-medium sm:text-sm">
                {f.label ?? humanize(f.key)}
              </dt>
              <dd className="text-foreground text-sm">
                <FieldValue field={f} value={readField(subject, f.key)} />
              </dd>
            </div>
          ))}
        </dl>
      )}
    </Card>
  );
}

/** A relation section: title + count, then compact related-node rows. */
function RelationCard({ relation }: { relation: RecordRelation }) {
  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <h3 className="text-sm font-medium">{relation.title}</h3>
        <Badge variant="outline" className="font-normal tabular-nums">
          {relation.nodes.length}
        </Badge>
      </div>
      <Separator />
      {relation.nodes.length === 0 ? (
        <p className="text-muted-foreground px-4 py-3 text-sm">
          관련 항목이 없습니다
        </p>
      ) : (
        <ul>
          {relation.nodes.map((node) => {
            const statusRaw =
              readField(node, "lifecycleStatus") ?? readField(node, "status");
            const status = statusRaw == null ? "" : String(statusRaw);
            return (
              <li
                key={node.id}
                className="border-border flex items-center justify-between gap-3 border-b px-4 py-2.5 last:border-b-0"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <FileTextIcon
                    className="text-muted-foreground size-4 shrink-0"
                    aria-hidden
                  />
                  <span className="text-foreground truncate text-sm font-medium">
                    {node.title || "제목 없음"}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {status ? <StatusBadge status={status} /> : null}
                  <Badge variant="outline" className="font-normal">
                    {node.catalogKey}
                  </Badge>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/** Full-page single-record detail: header + property sections + relations. */
function RecordViewEl({
  subject,
  statusField,
  sections,
  relations,
  actions,
}: {
  subject: RenderNode | undefined;
  statusField: string;
  sections: RecordSection[];
  relations: RecordRelation[];
  actions: RecordAction[];
}) {
  if (!subject) {
    return (
      <Empty className="rounded-lg border border-dashed py-10">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileDashedIcon className="size-5" />
          </EmptyMedia>
          <EmptyTitle>표시할 레코드가 없습니다</EmptyTitle>
          <EmptyDescription>
            이 페이지에 연결된 레코드를 찾을 수 없습니다.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const statusRaw = readField(subject, statusField);
  const status = statusRaw == null ? "" : String(statusRaw);

  return (
    <div className="space-y-4">
      <Card className="gap-0 overflow-hidden p-0">
        <div className="flex flex-wrap items-start justify-between gap-3 p-4">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-foreground text-lg font-semibold break-words">
                {subject.title || "제목 없음"}
              </h2>
              {status ? <StatusBadge status={status} /> : null}
            </div>
            <Badge variant="outline" className="font-normal">
              {subject.catalogKey}
            </Badge>
          </div>
          {actions.length > 0 ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {actions.map((a, i) => (
                <RecordActionButton
                  key={`${a.action ?? "action"}-${i}`}
                  subjectId={subject.id}
                  spec={a}
                />
              ))}
            </div>
          ) : null}
        </div>
      </Card>

      {sections.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {sections.map((s, i) => (
            <SectionCard key={`${s.title}-${i}`} subject={subject} section={s} />
          ))}
        </div>
      ) : null}

      {relations.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {relations.map((r, i) => (
            <RelationCard key={`${r.title}-${i}`} relation={r} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Resolve the subject node: a singleton/node binding, or the first row of a query array. */
function resolveSubject(
  bindingData: BindingContext,
  props: Record<string, unknown>,
): RenderNode | undefined {
  const single = boundNode(bindingData, props);
  const raw =
    typeof props.binding === "string" ? bindingData[props.binding] : undefined;
  const candidate = Array.isArray(raw) ? raw[0] : single;
  return candidate &&
    typeof candidate === "object" &&
    "id" in candidate &&
    "title" in candidate
    ? (candidate as RenderNode)
    : undefined;
}

/** Coerce raw `sections` prop → typed section list (catalog fn: coercion only). */
function coerceSections(raw: unknown): RecordSection[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((s): RecordSection[] => {
    if (!s || typeof s !== "object") return [];
    const rec = s as Record<string, unknown>;
    const fields = Array.isArray(rec.fields)
      ? (rec.fields as unknown[]).flatMap((f): RecordField[] => {
          if (!f || typeof f !== "object") return [];
          const fr = f as Record<string, unknown>;
          if (typeof fr.key !== "string") return [];
          const type =
            fr.type === "date" ||
            fr.type === "number" ||
            fr.type === "badge" ||
            fr.type === "text"
              ? fr.type
              : undefined;
          return [
            {
              key: fr.key,
              label: typeof fr.label === "string" ? fr.label : undefined,
              type,
            },
          ];
        })
      : [];
    return [
      { title: typeof rec.title === "string" ? rec.title : "", fields },
    ];
  });
}

/** Coerce raw `relations` prop → resolve each binding key to its related nodes. */
function coerceRelations(
  bindingData: BindingContext,
  raw: unknown,
): RecordRelation[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((r): RecordRelation[] => {
    if (!r || typeof r !== "object") return [];
    const rec = r as Record<string, unknown>;
    const key = typeof rec.binding === "string" ? rec.binding : undefined;
    return [
      {
        title: typeof rec.title === "string" ? rec.title : "",
        nodes: boundNodesByKey(bindingData, key),
      },
    ];
  });
}

/** Coerce raw `actions` prop → typed header action specs. */
function coerceActions(raw: unknown): RecordAction[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((a): RecordAction[] => {
    if (!a || typeof a !== "object") return [];
    const rec = a as Record<string, unknown>;
    if (typeof rec.label !== "string") return [];
    const variant =
      rec.variant === "default" ||
      rec.variant === "secondary" ||
      rec.variant === "outline" ||
      rec.variant === "ghost" ||
      rec.variant === "destructive"
        ? rec.variant
        : undefined;
    return [
      {
        label: rec.label,
        action: typeof rec.action === "string" ? rec.action : undefined,
        variant,
        field: typeof rec.field === "string" ? rec.field : undefined,
        property: typeof rec.property === "string" ? rec.property : undefined,
        value: "value" in rec ? rec.value : undefined,
      },
    ];
  });
}

/**
 * RecordView — a full-page single-node record detail (unlike a side sheet). Header
 * (title + flow-token status badge + action buttons) → grouped property sections
 * (definition grids with typed date/number/badge rendering) → relation sections
 * (each traverse/query binding resolved to a compact related-node list). Header
 * actions dispatch `{ nodeId, ... }` to existing action kinds. Empty/missing
 * subject renders a clear empty state.
 */
export const recordComponents: Record<string, CatalogComponent> = {
  RecordView: ({ props, bindingData }) => (
    <RecordViewEl
      subject={resolveSubject(bindingData, props)}
      statusField={
        typeof props.statusField === "string"
          ? props.statusField
          : "lifecycleStatus"
      }
      sections={coerceSections(props.sections)}
      relations={coerceRelations(bindingData, props.relations)}
      actions={coerceActions(props.actions)}
    />
  ),
};
