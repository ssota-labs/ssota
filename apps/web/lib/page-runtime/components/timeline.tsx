"use client";

import { useMemo, useState } from "react";
import { ClockIcon } from "@phosphor-icons/react";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@ssota/ui/components/ui/empty";
import { cn } from "@ssota/ui/lib/utils";
import { boundNodes } from "../bindings";
import { flowColorClasses, type FlowColorToken } from "../flow-tokens";
import type { CatalogComponent, RenderNode } from "../types";

/** Read `"title"` or a node property (domain-agnostic, matches the other data components). */
function readField(node: RenderNode, field: string): unknown {
  return field === "title"
    ? node.title
    : (node.properties as Record<string, unknown>)?.[field];
}

/**
 * Map a free-text status onto a shared flow-token bucket for the rail dot (R7).
 * Mirrors ApprovalInbox's mapping so a given status is the same color everywhere.
 */
function statusToken(status: string): FlowColorToken {
  const s = status.trim().toLowerCase();
  if (["approved", "done", "completed", "merged", "resolved", "published", "paid"].includes(s))
    return "green";
  if (["rejected", "failed", "blocked", "cancelled", "canceled", "error"].includes(s))
    return "red";
  if (["pending", "review", "waiting", "submitted", "todo", "draft", "open", "idea"].includes(s))
    return "amber";
  if (["active", "in_progress", "doing", "processing", "drafting", "scheduled"].includes(s))
    return "blue";
  return "gray";
}

function parseTime(value: unknown): number | null {
  if (value == null || value === "") return null;
  const t = new Date(String(value)).getTime();
  return Number.isNaN(t) ? null : t;
}

/** Absolute date + a coarse relative hint ("3일 전"), computed on the client. */
function formatWhen(ts: number, now: number): string {
  const abs = new Date(ts).toISOString().slice(0, 10);
  const diffDays = Math.floor((now - ts) / 86_400_000);
  if (diffDays <= 0) return `${abs} · 오늘`;
  if (diffDays === 1) return `${abs} · 어제`;
  if (diffDays < 30) return `${abs} · ${diffDays}일 전`;
  return abs;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

type Entry = {
  node: RenderNode;
  title: string;
  description: string | null;
  by: string | null;
  status: string | null;
  ts: number | null;
};

function TimelineEl({
  nodes,
  timeField,
  titleField,
  descriptionField,
  byField,
  statusField,
  groupByDay,
  emptyLabel,
}: {
  nodes: RenderNode[];
  timeField: string;
  titleField: string;
  descriptionField?: string;
  byField?: string;
  statusField?: string;
  groupByDay: boolean;
  emptyLabel?: string;
}) {
  const [dir, setDir] = useState<"desc" | "asc">("desc");
  const now = useMemo(() => Date.now(), []);

  const entries = useMemo<Entry[]>(() => {
    const mapped = nodes.map((node) => ({
      node,
      title: String(readField(node, titleField) ?? node.title ?? ""),
      description: descriptionField
        ? (readField(node, descriptionField) as string | null) ?? null
        : null,
      by: byField ? ((readField(node, byField) as string | null) ?? null) : null,
      status: statusField ? String(readField(node, statusField) ?? "") || null : null,
      ts: parseTime(readField(node, timeField)),
    }));
    const factor = dir === "asc" ? 1 : -1;
    // Undated entries sort last regardless of direction.
    return mapped.sort((a, b) => {
      if (a.ts == null) return 1;
      if (b.ts == null) return -1;
      return (a.ts - b.ts) * factor;
    });
  }, [nodes, timeField, titleField, descriptionField, byField, statusField, dir]);

  if (entries.length === 0) {
    return (
      <Empty className="rounded-lg border border-dashed py-10">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ClockIcon className="size-5" />
          </EmptyMedia>
          <EmptyTitle>{emptyLabel ?? "활동 기록이 없습니다"}</EmptyTitle>
          <EmptyDescription>
            변경이나 이벤트가 생기면 여기에 시간순으로 쌓입니다.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  let lastDay: string | null = null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setDir((d) => (d === "desc" ? "asc" : "desc"))}
        >
          {dir === "desc" ? "최신순" : "오래된순"}
        </Button>
      </div>
      <ol className="relative ml-2 flex flex-col gap-4 border-l pl-6">
        {entries.map((e) => {
          const token = statusToken(e.status ?? "");
          const colors = flowColorClasses(token);
          const day = e.ts != null ? new Date(e.ts).toISOString().slice(0, 10) : null;
          const showDay = groupByDay && day !== lastDay;
          lastDay = day;
          return (
            <li key={e.node.id} className="relative">
              {showDay && day ? (
                <div className="text-muted-foreground mb-2 -ml-6 text-xs font-medium">
                  {day}
                </div>
              ) : null}
              <span
                className={cn(
                  "absolute -left-[1.9rem] top-1 size-3 rounded-full border",
                  colors.surface,
                  colors.border,
                )}
                aria-hidden
              />
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{e.title || "제목 없음"}</span>
                  {e.status ? (
                    <Badge
                      variant="outline"
                      className={cn("shrink-0 border capitalize", colors.surface, colors.border, colors.text)}
                    >
                      {e.status}
                    </Badge>
                  ) : null}
                </div>
                {e.description ? (
                  <p className="text-muted-foreground text-xs">{e.description}</p>
                ) : null}
                <div className="text-muted-foreground flex items-center gap-2 text-xs">
                  {e.by ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="bg-muted text-muted-foreground inline-flex size-4 items-center justify-center rounded-full text-[9px] font-semibold">
                        {initials(e.by)}
                      </span>
                      {e.by}
                    </span>
                  ) : null}
                  {e.ts != null ? <span>{formatWhen(e.ts, now)}</span> : <span>날짜 없음</span>}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * Timeline / ActivityFeed — a vertical, time-ordered feed of graph nodes. Each
 * entry shows a status-colored rail dot, title, optional description + actor, and
 * a timestamp; newest-first by default with a direction toggle and optional day
 * grouping. Read-mostly (audit logs, change history, activity). Colors come from
 * the shared flow-token map.
 */
export const timelineComponents: Record<string, CatalogComponent> = {
  Timeline: ({ props, bindingData }) => (
    <TimelineEl
      nodes={boundNodes(bindingData, props)}
      timeField={typeof props.timeField === "string" ? props.timeField : "createdAt"}
      titleField={typeof props.titleField === "string" ? props.titleField : "title"}
      descriptionField={
        typeof props.descriptionField === "string" ? props.descriptionField : undefined
      }
      byField={typeof props.byField === "string" ? props.byField : undefined}
      statusField={typeof props.statusField === "string" ? props.statusField : undefined}
      groupByDay={props.groupByDay === true}
      emptyLabel={typeof props.emptyLabel === "string" ? props.emptyLabel : undefined}
    />
  ),
};
