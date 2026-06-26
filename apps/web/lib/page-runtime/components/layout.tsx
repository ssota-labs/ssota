import { Children, Fragment, type ReactNode } from "react";
import { Badge } from "@ssota/ui/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@ssota/ui/components/ui/resizable";
import { cn } from "@ssota/ui/lib/utils";
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

function paddingClass(
  value: unknown,
  defaultPadding = true,
): string | undefined {
  if (value === "none") return undefined;
  if (value === "default") return "p-4 md:p-6";
  return defaultPadding ? "p-4 md:p-6" : undefined;
}

function asNumberArray(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const nums = value.filter((item): item is number => typeof item === "number");
  return nums.length > 0 ? nums : undefined;
}

function gridColumnsClass(columns: unknown): string {
  if (columns === 3 || columns === "3") return "grid-cols-1 md:grid-cols-3";
  if (columns === "sidebar") return "grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]";
  return "grid-cols-1 md:grid-cols-2";
}

function gridGapClass(gap: unknown): string {
  return gap === "sm" ? "gap-2" : "gap-4";
}

function stackGapClass(gap: unknown): string {
  if (gap === "sm") return "gap-2";
  if (gap === "lg") return "gap-8";
  return "gap-4";
}

/** Structural / static display components. */
export const layoutComponents: Record<string, CatalogComponent> = {
  PageHeader: ({ props }) => (
    <header className="shrink-0 space-y-1 px-4 pt-4 md:px-6 md:pt-6">
      <h1 className="text-2xl font-semibold">{String(props.title ?? "Page")}</h1>
      {props.subtitle ? (
        <p className="text-muted-foreground text-sm">{String(props.subtitle)}</p>
      ) : null}
    </header>
  ),
  Section: ({ props, children }) => (
    <section
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-4",
        paddingClass(props.padding),
      )}
    >
      <header className="shrink-0 space-y-1 border-b pb-3">
        <h2 className="text-lg font-semibold">{String(props.title ?? "Section")}</h2>
        {props.subtitle ? (
          <p className="text-muted-foreground text-sm">{String(props.subtitle)}</p>
        ) : null}
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
        {children}
      </div>
    </section>
  ),
  Grid: ({ props, children }) => (
    <div
      className={cn(
        "grid min-h-0 flex-1",
        gridColumnsClass(props.columns),
        gridGapClass(props.gap),
        paddingClass(props.padding),
      )}
      data-testid="page-grid"
    >
      {children}
    </div>
  ),
  Resizable: ({ props, children }) => {
    const panels = Children.toArray(children) as ReactNode[];
    const orientation =
      props.orientation === "vertical" ? "vertical" : "horizontal";
    const defaultSizes = asNumberArray(props.defaultSizes);
    const minSizes = asNumberArray(props.minSizes);

    return (
      <ResizablePanelGroup
        orientation={orientation}
        className="flex min-h-0 flex-1"
        data-testid="resizable-panels"
      >
        {panels.map((panel, index) => (
          <Fragment key={index}>
            {index > 0 ? <ResizableHandle withHandle /> : null}
            <ResizablePanel
              defaultSize={defaultSizes?.[index]}
              minSize={minSizes?.[index]}
              className="min-h-0"
            >
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {panel}
              </div>
            </ResizablePanel>
          </Fragment>
        ))}
      </ResizablePanelGroup>
    );
  },
  Stack: ({ props, children }) => {
    const childArray = Children.toArray(children);
    const lastIndex = childArray.length - 1;
    return (
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden",
          stackGapClass(props.gap),
          paddingClass(props.padding, false),
        )}
        data-testid="page-stack"
      >
        {childArray.map((child, index) => (
          <div
            key={index}
            className={cn(
              "flex min-h-0 flex-col",
              index === lastIndex
                ? "min-h-0 flex-1 overflow-hidden"
                : "shrink-0",
            )}
          >
            {child}
          </div>
        ))}
      </div>
    );
  },
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
};
