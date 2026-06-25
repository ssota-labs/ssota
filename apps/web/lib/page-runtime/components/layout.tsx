import { Children, type ReactNode } from "react";
import { Badge } from "@ssota/ui/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";
import type { CatalogComponent } from "../types";
import { TabsEl, type TabItemDef } from "./layout-tabs";
import { ToolbarEl, type ToolbarActionDef } from "./layout-toolbar";

function asTabItems(value: unknown): TabItemDef[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    if (
      typeof row.value !== "string" ||
      typeof row.label !== "string" ||
      typeof row.panel !== "string"
    ) {
      return [];
    }
    return [
      {
        value: row.value,
        label: row.label,
        panel: row.panel,
      },
    ];
  });
}

function asToolbarActions(value: unknown): ToolbarActionDef[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    if (typeof row.label !== "string" || typeof row.action !== "string") {
      return [];
    }
    const variant = row.variant;
    return [
      {
        label: row.label,
        action: row.action,
        variant:
          variant === "default" ||
          variant === "outline" ||
          variant === "secondary" ||
          variant === "ghost"
            ? variant
            : undefined,
      },
    ];
  });
}

/** Structural / static display components. */
export const layoutComponents: Record<string, CatalogComponent> = {
  PageHeader: ({ props }) => (
    <header className="mb-4 space-y-1">
      <h1 className="text-2xl font-semibold">{String(props.title ?? "Page")}</h1>
      {props.subtitle ? (
        <p className="text-muted-foreground text-sm">{String(props.subtitle)}</p>
      ) : null}
    </header>
  ),
  Section: ({ props, children }) => (
    <section className="space-y-4">
      <header className="space-y-1 border-b pb-3">
        <h2 className="text-lg font-semibold">{String(props.title ?? "Section")}</h2>
        {props.subtitle ? (
          <p className="text-muted-foreground text-sm">{String(props.subtitle)}</p>
        ) : null}
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  ),
  Text: ({ props }) => <p className="text-sm">{String(props.text ?? "")}</p>,
  Badge: ({ props }) => (
    <Badge variant="secondary">{String(props.label ?? "Badge")}</Badge>
  ),
  Card: ({ props, children }) => (
    <Card className="mb-4">
      {props.title ? (
        <CardHeader>
          <CardTitle>{String(props.title)}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  ),
  Tabs: ({ props }) => (
    <TabsEl
      defaultValue={
        typeof props.defaultValue === "string" ? props.defaultValue : undefined
      }
      items={asTabItems(props.items)}
      variant={props.variant === "default" ? "default" : "line"}
    />
  ),
  Toolbar: ({ props }) => (
    <ToolbarEl
      title={props.title ? String(props.title) : undefined}
      searchPlaceholder={
        props.searchPlaceholder ? String(props.searchPlaceholder) : undefined
      }
      actions={asToolbarActions(props.actions)}
    />
  ),
  SplitPane: ({ children }) => {
    const childArray = Children.toArray(children);
    const [primary, secondary, ...rest] = childArray as ReactNode[];

    return (
      <div
        className="flex min-h-0 flex-1 overflow-hidden"
        data-testid="split-pane"
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {primary}
        </div>
        {secondary != null ? (
          <aside
            className="flex min-h-0 w-full max-w-md shrink-0 flex-col border-l bg-muted/20 md:w-[38%] md:max-w-none"
            data-testid="split-pane-side"
          >
            <div className="flex min-h-0 flex-1 flex-col overflow-auto p-4 md:p-5">
              {secondary}
            </div>
          </aside>
        ) : null}
        {rest}
      </div>
    );
  },
};
