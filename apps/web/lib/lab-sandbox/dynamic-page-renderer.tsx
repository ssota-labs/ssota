"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { JsonRenderSpec } from "@ssota/contracts";
import { Badge } from "@ssota/ui/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";
import type { BindingContext } from "./binding-resolver";
import type { MockNode } from "./types";
import type { ResolvedArtifact } from "@/lib/design-studio/resolve-artifact-binding";

// BlockNote is browser-only; load the document components lazily (no SSR).
const DocumentViewEl = dynamic(
  () => import("./catalog-document").then((m) => m.DocumentViewEl),
  { ssr: false },
);
const DocumentEditorEl = dynamic(
  () => import("./catalog-document").then((m) => m.DocumentEditorEl),
  { ssr: false },
);
const WidgetEl = dynamic(
  () => import("./catalog-widget").then((m) => m.WidgetEl),
  { ssr: false },
);

export const UI_CATALOG_COMPONENTS = [
  "PageHeader",
  "Text",
  "Badge",
  "Card",
  "NodeList",
  "NodeTable",
  "NodeDocument",
  "NodeField",
  "Tabs",
  "SplitPane",
  "Form",
  "Field",
  "Button",
  "Input",
  "Textarea",
  "Select",
  "DocumentView",
  "DocumentEditor",
  "TokenList",
  "Widget",
] as const;

/** A token definition for TokenList (domain-agnostic; supplied via props). */
export type TokenDef = {
  name: string;
  label?: string;
  kind?: "color" | "length" | "font" | "select";
  options?: string[];
};

/** Invoked when an interactive element fires its action. */
export type OnAction = (
  actionKey: string,
  input: Record<string, unknown>,
) => void | Promise<void>;

const ActionContext = createContext<OnAction | undefined>(undefined);

type FormCtx = {
  values: Record<string, unknown>;
  setValue: (name: string, value: unknown) => void;
};
const FormValuesContext = createContext<FormCtx | null>(null);

function FormEl({ children }: { children: React.ReactNode }) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const setValue = (name: string, value: unknown) =>
    setValues((prev) => ({ ...prev, [name]: value }));
  return (
    <FormValuesContext.Provider value={{ values, setValue }}>
      <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
        {children}
      </form>
    </FormValuesContext.Provider>
  );
}

function FieldEl({
  name,
  label,
  placeholder,
  inputType,
}: {
  name: string;
  label?: string;
  placeholder?: string;
  inputType?: string;
}) {
  const form = useContext(FormValuesContext);
  const value = (form?.values[name] ?? "") as string;
  return (
    <label className="block space-y-1 text-sm">
      {label ? <span className="text-muted-foreground">{label}</span> : null}
      <input
        type={inputType ?? "text"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => form?.setValue(name, e.target.value)}
        className="border-border w-full rounded-md border px-2 py-1.5 text-sm"
      />
    </label>
  );
}

function ButtonEl({
  actionKey,
  label,
}: {
  actionKey?: string;
  label: string;
}) {
  const onAction = useContext(ActionContext);
  const form = useContext(FormValuesContext);
  const [pending, setPending] = useState(false);
  const disabled = !onAction || !actionKey || pending;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={async () => {
        if (!onAction || !actionKey) return;
        setPending(true);
        try {
          await onAction(actionKey, form?.values ?? {});
        } finally {
          setPending(false);
        }
      }}
      className="bg-primary text-primary-foreground inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50"
    >
      {pending ? "…" : label}
    </button>
  );
}

/** `/{org}/{project}` prefix for in-page links (e.g. NodeTable rows). */
const BasePathContext = createContext<string>("");

/** Triggers a server-side build for an unbuilt buildable node (Widget). */
const WidgetBuildContext = createContext<
  ((nodeId: string) => void | Promise<void>) | undefined
>(undefined);

/** Widget bound to base path + build trigger from context. */
function BoundWidget({
  data,
  height,
  componentProps,
}: {
  data: ResolvedArtifact | undefined;
  height?: number;
  componentProps?: Record<string, unknown>;
}) {
  const basePath = useContext(BasePathContext);
  const onBuildWidget = useContext(WidgetBuildContext);
  const nodeId = data?.nodeId;
  return (
    <WidgetEl
      data={data}
      basePath={basePath}
      height={height}
      componentProps={componentProps}
      onBuild={
        onBuildWidget && nodeId ? () => onBuildWidget(nodeId) : undefined
      }
    />
  );
}

/** Generic single-field editor bound to an action; sends `{ value }`. */
function ActionFieldEl({
  actionKey,
  label,
  initialValue,
  kind = "input",
  options,
  placeholder,
}: {
  actionKey?: string;
  label?: string;
  initialValue?: string;
  kind?: "input" | "textarea" | "select";
  options?: string[];
  placeholder?: string;
}) {
  const onAction = useContext(ActionContext);
  const [value, setValue] = useState(initialValue ?? "");
  const commit = (v: string) => {
    if (onAction && actionKey) void onAction(actionKey, { value: v });
  };
  const cls = "border-border w-full rounded-md border px-2 py-1.5 text-sm";
  return (
    <label className="block space-y-1 text-sm">
      {label ? <span className="text-muted-foreground">{label}</span> : null}
      {kind === "textarea" ? (
        <textarea
          className={cls}
          value={value}
          placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => commit(value)}
        />
      ) : kind === "select" ? (
        <select
          className={cls}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            commit(e.target.value);
          }}
        >
          {(options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input
          className={cls}
          value={value}
          placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => commit(value)}
        />
      )}
    </label>
  );
}

/** DocumentEditor bound to an action; sends the BlockNote doc as `{ doc }`. */
function BoundDocumentEditor({
  actionKey,
  content,
}: {
  actionKey?: string;
  content: unknown;
}) {
  const onAction = useContext(ActionContext);
  return (
    <DocumentEditorEl
      content={content}
      onSave={(blocks) => {
        if (onAction && actionKey) void onAction(actionKey, { doc: blocks });
      }}
    />
  );
}

function NodeTableEl({
  nodes,
  columns,
  rowHref,
  title,
}: {
  nodes: MockNode[];
  columns: { key: string; header: string }[];
  rowHref?: string;
  title?: string;
}) {
  const basePath = useContext(BasePathContext);
  const cols = columns.length ? columns : [{ key: "title", header: "Title" }];
  const cell = (node: MockNode, key: string) =>
    key === "title"
      ? node.title
      : String(
          (node.properties as Record<string, unknown>)?.[key] ?? "—",
        );
  return (
    <div className="space-y-2">
      {title ? <h2 className="text-sm font-medium">{title}</h2> : null}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-muted-foreground text-left">
            {cols.map((c) => (
              <th key={c.key} className="border-b px-2 py-1 font-medium">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {nodes.map((node) => (
            <tr key={node.id} className="hover:bg-muted/40">
              {cols.map((c, i) => (
                <td key={c.key} className="border-b px-2 py-1">
                  {i === 0 && rowHref ? (
                    <Link
                      href={`${basePath}/${rowHref}/${node.id}`}
                      className="text-foreground hover:underline"
                    >
                      {cell(node, c.key)}
                    </Link>
                  ) : (
                    cell(node, c.key)
                  )}
                </td>
              ))}
            </tr>
          ))}
          {nodes.length === 0 ? (
            <tr>
              <td colSpan={cols.length} className="text-muted-foreground px-2 py-2">
                No rows
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function TokenFieldEl({
  def,
  value,
  onChange,
}: {
  def: TokenDef;
  value: string;
  onChange: (v: string) => void;
}) {
  const label = def.label ?? def.name;
  if (def.kind === "color") {
    return (
      <label className="flex flex-col gap-1.5">
        <span className="text-muted-foreground text-xs">{label}</span>
        <div className="flex items-center gap-2">
          <span
            className="border-border size-8 shrink-0 rounded-md border"
            style={{ backgroundColor: value || undefined }}
          />
          <input
            className="border-border w-full rounded-md border px-2 py-1 font-mono text-xs"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      </label>
    );
  }
  if (def.kind === "select") {
    return (
      <label className="flex flex-col gap-1.5">
        <span className="text-muted-foreground text-xs">{label}</span>
        <select
          className="border-border w-full rounded-md border px-2 py-1 text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {(def.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </label>
    );
  }
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <input
        className="border-border w-full rounded-md border px-2 py-1 font-mono text-xs"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

/** Token grid bound to an action; debounced, sends the full token map `{ tokens }`. */
function TokenListEl({
  actionKey,
  manifest,
  initial,
}: {
  actionKey?: string;
  manifest: TokenDef[];
  initial: Record<string, string>;
}) {
  const onAction = useContext(ActionContext);
  const [map, setMap] = useState<Record<string, string>>(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const set = (name: string, value: string) => {
    setMap((prev) => {
      const next = { ...prev, [name]: value };
      if (onAction && actionKey) {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          void onAction(actionKey, { tokens: next });
        }, 500);
      }
      return next;
    });
  };
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {manifest.map((t) => (
        <TokenFieldEl
          key={t.name}
          def={t}
          value={map[t.name] ?? ""}
          onChange={(v) => set(t.name, v)}
        />
      ))}
    </div>
  );
}

type RenderProps = {
  spec: JsonRenderSpec;
  bindingData: BindingContext;
  /** Bound on the production route; omitted in the lab preview (buttons no-op). */
  onAction?: OnAction;
  /** `/{org}/{project}` prefix for in-page links. */
  basePath?: string;
  /** Triggers a server-side build for an unbuilt buildable Widget node. */
  onBuildWidget?: (nodeId: string) => void | Promise<void>;
};

function asNodes(value: unknown): MockNode[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is MockNode =>
      !!item &&
      typeof item === "object" &&
      "id" in item &&
      "title" in item,
  );
}

function renderElement(
  elementId: string,
  spec: JsonRenderSpec,
  bindingData: BindingContext,
): React.ReactNode {
  const element = spec.elements[elementId];
  if (!element) return null;

  const childNodes = (element.children ?? []).map((childId) =>
    renderElement(childId, spec, bindingData),
  );

  const props = element.props ?? {};

  switch (element.type) {
    case "PageHeader":
      return (
        <header key={elementId} className="mb-4 space-y-1">
          <h1 className="text-2xl font-semibold">
            {String(props.title ?? "Page")}
          </h1>
          {props.subtitle ? (
            <p className="text-muted-foreground text-sm">
              {String(props.subtitle)}
            </p>
          ) : null}
        </header>
      );
    case "Text":
      return (
        <p key={elementId} className="text-sm">
          {String(props.text ?? "")}
        </p>
      );
    case "Badge":
      return (
        <Badge key={elementId} variant="secondary">
          {String(props.label ?? "Badge")}
        </Badge>
      );
    case "Card":
      return (
        <Card key={elementId} className="mb-4">
          {props.title ? (
            <CardHeader>
              <CardTitle>{String(props.title)}</CardTitle>
            </CardHeader>
          ) : null}
          <CardContent className="space-y-3">{childNodes}</CardContent>
        </Card>
      );
    case "NodeList": {
      const bindingKey =
        typeof props.binding === "string" ? props.binding : "rows";
      const rows = asNodes(bindingData[bindingKey]);
      return (
        <div key={elementId} className="space-y-2">
          {props.title ? (
            <h2 className="text-sm font-medium">{String(props.title)}</h2>
          ) : null}
          <ul className="space-y-2">
            {rows.map((row) => (
              <li
                key={row.id}
                className="border-border rounded-md border px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{row.title}</span>
                  <Badge variant="outline">{row.catalogKey}</Badge>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  {String(row.properties.lifecycleStatus ?? "—")}
                </p>
              </li>
            ))}
            {rows.length === 0 ? (
              <li className="text-muted-foreground text-sm">No rows</li>
            ) : null}
          </ul>
        </div>
      );
    }
    case "NodeDocument":
      return (
        <div key={elementId} className="bg-muted/40 rounded-md border p-4 text-sm">
          Document preview (mock)
        </div>
      );
    case "NodeField":
      return (
        <div key={elementId} className="text-sm">
          <span className="text-muted-foreground">{String(props.label)}: </span>
          <span>{String(props.value ?? "—")}</span>
        </div>
      );
    case "Tabs":
      return (
        <div key={elementId} className="space-y-3">
          <p className="text-muted-foreground text-xs">Tabs (mock layout)</p>
          {childNodes}
        </div>
      );
    case "SplitPane":
      return (
        <div key={elementId} className="grid gap-4 md:grid-cols-2">
          {childNodes}
        </div>
      );
    case "Form":
      return <FormEl key={elementId}>{childNodes}</FormEl>;
    case "Field":
      return (
        <FieldEl
          key={elementId}
          name={String(props.name ?? elementId)}
          label={props.label ? String(props.label) : undefined}
          placeholder={props.placeholder ? String(props.placeholder) : undefined}
          inputType={props.inputType ? String(props.inputType) : undefined}
        />
      );
    case "Button":
      return (
        <ButtonEl
          key={elementId}
          actionKey={
            typeof props.action === "string" ? props.action : undefined
          }
          label={String(props.label ?? "Submit")}
        />
      );
    case "NodeTable": {
      const bindingKey =
        typeof props.binding === "string" ? props.binding : "rows";
      return (
        <NodeTableEl
          key={elementId}
          nodes={asNodes(bindingData[bindingKey])}
          columns={
            Array.isArray(props.columns)
              ? (props.columns as { key: string; header: string }[])
              : []
          }
          rowHref={typeof props.rowHref === "string" ? props.rowHref : undefined}
          title={props.title ? String(props.title) : undefined}
        />
      );
    }
    case "DocumentView":
    case "DocumentEditor": {
      const node =
        typeof props.binding === "string"
          ? (bindingData[props.binding] as MockNode | undefined)
          : undefined;
      const field = typeof props.field === "string" ? props.field : "content";
      const content = node?.properties?.[field];
      return element.type === "DocumentView" ? (
        <div key={elementId}>
          <DocumentViewEl content={content} />
        </div>
      ) : (
        <div key={elementId}>
          <BoundDocumentEditor
            actionKey={
              typeof props.action === "string" ? props.action : undefined
            }
            content={content}
          />
        </div>
      );
    }
    case "Input":
    case "Textarea":
    case "Select": {
      const node =
        typeof props.binding === "string"
          ? (bindingData[props.binding] as MockNode | undefined)
          : undefined;
      const field = typeof props.field === "string" ? props.field : undefined;
      const initialValue =
        field && node?.properties
          ? String(node.properties[field] ?? "")
          : typeof props.value === "string"
            ? props.value
            : "";
      const kind =
        element.type === "Textarea"
          ? "textarea"
          : element.type === "Select"
            ? "select"
            : "input";
      return (
        <ActionFieldEl
          key={elementId}
          actionKey={typeof props.action === "string" ? props.action : undefined}
          label={props.label ? String(props.label) : undefined}
          placeholder={props.placeholder ? String(props.placeholder) : undefined}
          initialValue={initialValue}
          kind={kind}
          options={
            Array.isArray(props.options)
              ? (props.options as string[])
              : undefined
          }
        />
      );
    }
    case "TokenList": {
      const node =
        typeof props.binding === "string"
          ? (bindingData[props.binding] as MockNode | undefined)
          : undefined;
      const field = typeof props.field === "string" ? props.field : "tokens";
      const stored = (node?.properties?.[field] ?? {}) as Record<string, string>;
      const manifest = Array.isArray(props.manifest)
        ? (props.manifest as TokenDef[])
        : [];
      const initial: Record<string, string> = {};
      for (const t of manifest) initial[t.name] = stored[t.name] ?? "";
      return (
        <TokenListEl
          key={elementId}
          actionKey={typeof props.action === "string" ? props.action : undefined}
          manifest={manifest}
          initial={initial}
        />
      );
    }
    case "Widget": {
      const data =
        typeof props.binding === "string"
          ? (bindingData[props.binding] as ResolvedArtifact | undefined)
          : undefined;
      return (
        <BoundWidget
          key={elementId}
          data={data}
          height={typeof props.height === "number" ? props.height : undefined}
          componentProps={
            props.componentProps &&
            typeof props.componentProps === "object" &&
            !Array.isArray(props.componentProps)
              ? (props.componentProps as Record<string, unknown>)
              : undefined
          }
        />
      );
    }
    default:
      return (
        <div
          key={elementId}
          className="border-destructive/40 text-destructive rounded border border-dashed p-2 text-xs"
        >
          Unknown component: {element.type}
        </div>
      );
  }
}

export function DynamicPageRenderer({
  spec,
  bindingData,
  onAction,
  basePath = "",
  onBuildWidget,
}: RenderProps) {
  return (
    <ActionContext.Provider value={onAction}>
      <WidgetBuildContext.Provider value={onBuildWidget}>
        <BasePathContext.Provider value={basePath}>
          <div className="space-y-2" data-testid="dynamic-page-renderer">
            {renderElement(spec.root, spec, bindingData)}
          </div>
        </BasePathContext.Provider>
      </WidgetBuildContext.Provider>
    </ActionContext.Provider>
  );
}
