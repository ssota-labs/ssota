"use client";

import { CaretRightIcon, PlusIcon } from "@phosphor-icons/react";
import { Button } from "@ssota/ui/components/ui/button";
import type { RenderNode } from "../types";
import { DocumentStatusBadge } from "./document-status-badge";

type RoadmapDocCardProps = {
  title: string;
  subtitle?: string;
  status?: string;
  empty?: boolean;
  emptyLabel?: string;
  createLabel?: string;
  testId?: string;
  onOpen?: () => void;
  onCreate?: () => void;
};

export function RoadmapDocCard({
  title,
  subtitle,
  status,
  empty = false,
  emptyLabel,
  createLabel,
  testId,
  onOpen,
  onCreate,
}: RoadmapDocCardProps) {
  if (empty) {
    return (
      <div
        data-testid={testId}
        className="border-border bg-muted/20 flex flex-col gap-3 rounded-lg border border-dashed p-4"
      >
        <div className="space-y-1">
          <h3 className="text-sm font-medium">{title}</h3>
          {emptyLabel ? (
            <p className="text-muted-foreground text-xs">{emptyLabel}</p>
          ) : null}
        </div>
        {createLabel && onCreate ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="self-start"
            data-testid={testId ? `${testId}-create` : undefined}
            onClick={onCreate}
          >
            <PlusIcon className="size-3.5" />
            {createLabel}
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      data-testid={testId}
      className="border-border bg-card hover:bg-muted/40 group flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors"
      onClick={onOpen}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold">{title}</h3>
          {status ? <DocumentStatusBadge status={status} /> : null}
        </div>
        {subtitle ? (
          <p className="text-muted-foreground line-clamp-2 text-xs">{subtitle}</p>
        ) : null}
      </div>
      <CaretRightIcon
        className="text-muted-foreground size-4 shrink-0 opacity-70 transition-transform group-hover:translate-x-0.5"
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
