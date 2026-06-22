"use client";

import { CaretRightIcon, PlusIcon } from "@phosphor-icons/react";
import { Button } from "@ssota/ui/components/ui/button";
import { cn } from "@ssota/ui/lib/utils";
import type { RenderNode } from "../types";
import { DocumentStatusBadge } from "./document-status-badge";

type RoadmapDocCardProps = {
  title: string;
  subtitle?: string;
  status?: string;
  eyebrow?: string;
  empty?: boolean;
  emptyLabel?: string;
  createLabel?: string;
  testId?: string;
  compact?: boolean;
  onOpen?: () => void;
  onCreate?: () => void;
};

export function RoadmapDocCard({
  title,
  subtitle,
  status,
  eyebrow,
  empty = false,
  emptyLabel,
  createLabel,
  testId,
  compact = false,
  onOpen,
  onCreate,
}: RoadmapDocCardProps) {
  if (empty) {
    return (
      <div
        data-testid={testId}
        className={cn(
          "border-border bg-muted/20 flex h-full flex-col gap-2 rounded-lg border border-dashed",
          compact ? "p-3" : "gap-3 p-4",
        )}
      >
        {eyebrow ? (
          <p className="text-muted-foreground truncate text-xs">{eyebrow}</p>
        ) : null}
        <div className="space-y-1">
          <h3 className={cn("font-medium", compact ? "text-xs" : "text-sm")}>
            {title}
          </h3>
          {emptyLabel && !compact ? (
            <p className="text-muted-foreground text-xs">{emptyLabel}</p>
          ) : null}
        </div>
        {createLabel && onCreate ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={cn("self-start", compact && "h-7 px-2 text-xs")}
            data-testid={testId ? `${testId}-create` : undefined}
            onClick={onCreate}
          >
            <PlusIcon className={cn(compact ? "size-3" : "size-3.5")} />
            {compact ? null : createLabel}
            {compact ? <span className="sr-only">{createLabel}</span> : null}
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      data-testid={testId}
      className={cn(
        "border-border bg-card hover:bg-muted/40 group flex h-full w-full items-start gap-2 rounded-lg border text-left transition-colors",
        compact ? "p-3" : "gap-3 p-4",
      )}
      onClick={onOpen}
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        {eyebrow ? (
          <p className="text-muted-foreground truncate text-xs">{eyebrow}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-1.5">
          <h3
            className={cn(
              "font-semibold",
              compact ? "truncate text-xs" : "text-sm",
            )}
          >
            {title}
          </h3>
          {status ? <DocumentStatusBadge status={status} /> : null}
        </div>
        {subtitle && !compact ? (
          <p className="text-muted-foreground line-clamp-2 text-xs">{subtitle}</p>
        ) : null}
      </div>
      <CaretRightIcon
        className={cn(
          "text-muted-foreground shrink-0 opacity-70 transition-transform group-hover:translate-x-0.5",
          compact ? "mt-0.5 size-3.5" : "mt-1 size-4",
        )}
        aria-hidden
      />
    </button>
  );
}

export function readNodeField(node: RenderNode, key: string | undefined): string {
  if (!key) return "";
  if (key === "title") return node.title;
  const value = node.properties[key];
  return typeof value === "string" ? value : "";
}

export function readRoadmapKind(node: RenderNode): "annual" | "quarter" | undefined {
  const kind = node.properties.kind;
  return kind === "annual" || kind === "quarter" ? kind : undefined;
}

export function readRoadmapYear(node: RenderNode): number | undefined {
  return typeof node.properties.year === "number" ? node.properties.year : undefined;
}

export function readRoadmapQuarter(node: RenderNode): 1 | 2 | 3 | 4 | undefined {
  const quarter = node.properties.quarter;
  return quarter === 1 || quarter === 2 || quarter === 3 || quarter === 4
    ? quarter
    : undefined;
}
