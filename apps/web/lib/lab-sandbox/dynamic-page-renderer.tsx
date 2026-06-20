"use client";

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
] as const;

type RenderProps = {
  spec: JsonRenderSpec;
  bindingData: BindingContext;
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

export function DynamicPageRenderer({ spec, bindingData }: RenderProps) {
  return (
    <div className="space-y-2" data-testid="dynamic-page-renderer">
      {renderElement(spec.root, spec, bindingData)}
    </div>
  );
}
