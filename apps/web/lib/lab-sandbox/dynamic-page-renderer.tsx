"use client";

import { createContext, useContext, useState } from "react";
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

export const UI_CATALOG_COMPONENTS = [
  "PageHeader",
  "Text",
  "Badge",
  "Card",
  "NodeList",
  "NodeDocument",
  "NodeField",
  "Tabs",
  "SplitPane",
  "Form",
  "Field",
  "Button",
] as const;

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

type RenderProps = {
  spec: JsonRenderSpec;
  bindingData: BindingContext;
  /** Bound on the production route; omitted in the lab preview (buttons no-op). */
  onAction?: OnAction;
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

export function DynamicPageRenderer({ spec, bindingData, onAction }: RenderProps) {
  return (
    <ActionContext.Provider value={onAction}>
      <div className="space-y-2" data-testid="dynamic-page-renderer">
        {renderElement(spec.root, spec, bindingData)}
      </div>
    </ActionContext.Provider>
  );
}
