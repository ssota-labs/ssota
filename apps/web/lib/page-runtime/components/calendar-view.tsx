"use client";

import { useMemo, useState } from "react";
import {
  CalendarBlankIcon,
  CaretLeftIcon,
  CaretRightIcon,
} from "@phosphor-icons/react";
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
import { useAction } from "../context";
import { useSelection } from "../selection-context";
import { boundNodes } from "../bindings";
import { asColorToken, flowColorClasses, type FlowColorToken } from "../flow-tokens";
import type { CatalogComponent, RenderNode } from "../types";

/**
 * CalendarView — a month calendar that places graph nodes on their date (§B3).
 *
 * Domain-agnostic: each bound node is an event positioned by its `dateField`
 * (optionally spanning to `endField` for multi-day items), tinted by a
 * `colorField` that maps onto the shared flow-token palette. Clicking an event
 * selects its node via `url_selection` (falling back to local state in the lab,
 * where no selection binding is wired) and optionally dispatches `selectAction`
 * with `{ nodeId }`. Serves 근태·휴가·이벤트·스프린트 calendars alike.
 *
 * All color comes from the allowlisted `flow-tokens` map + `@ssota/ui` semantic
 * tokens — no raw hex / Tailwind palette ([DS-01/02/03]). The catalog fn is
 * hook-free and delegates every bit of state to `<CalendarViewEl/>`.
 */

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;
const MAX_VISIBLE_PER_DAY = 3;
const DEFAULT_EVENT_TOKEN: FlowColorToken = "blue";

type CalEvent = {
  node: RenderNode;
  /** Local-midnight epoch ms for the first and last day the event covers. */
  start: number;
  end: number;
  token: FlowColorToken;
  title: string;
};

type MonthCursor = { year: number; month: number };

/** Read `"title"` or a node property, domain-agnostic (matches DataTable's readCell). */
function readField(node: RenderNode, field: string): unknown {
  return field === "title"
    ? node.title
    : (node.properties as Record<string, unknown>)?.[field];
}

/** Strip a Date down to a fresh local-midnight Date. */
function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Parse a node date value into a local-midnight Date; `null` when absent/invalid.
 * Date-only `YYYY-MM-DD` strings are built in local time so they don't drift a
 * day under UTC parsing; other strings/numbers fall back to `new Date(...)`.
 */
function parseDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : startOfDay(value);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : startOfDay(d);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return null;
    const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
    if (ymd) {
      const d = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : startOfDay(parsed);
  }
  return null;
}

/** Resolve the initially displayed month: `initialMonth` prop → today's month. */
function resolveInitialCursor(initialMonth: string | undefined): MonthCursor {
  const parsed = initialMonth ? parseDate(initialMonth) : null;
  const base = parsed ?? new Date();
  return { year: base.getFullYear(), month: base.getMonth() };
}

function toDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function EventChip({
  title,
  token,
  selected,
  onSelect,
}: {
  title: string;
  token: FlowColorToken;
  selected: boolean;
  onSelect: () => void;
}) {
  const classes = flowColorClasses(token);
  return (
    <button
      type="button"
      title={title}
      aria-pressed={selected}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={cn(
        "block w-full rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        selected &&
          "ring-2 ring-ring ring-offset-1 ring-offset-background",
      )}
    >
      <Badge
        variant="outline"
        className={cn(
          "w-full justify-start gap-1 truncate border px-1.5 py-0 text-[11px] font-medium",
          classes.surface,
          classes.border,
          classes.text,
        )}
      >
        <span className="truncate">{title || "제목 없음"}</span>
      </Badge>
    </button>
  );
}

function CalendarViewEl({
  nodes,
  dateField,
  endField,
  titleField,
  colorField,
  selectAction,
  initialMonth,
}: {
  nodes: RenderNode[];
  dateField: string;
  endField?: string;
  titleField: string;
  colorField?: string;
  selectAction?: string;
  initialMonth?: string;
}) {
  const onAction = useAction();
  const selection = useSelection();
  const [cursor, setCursor] = useState<MonthCursor>(() =>
    resolveInitialCursor(initialMonth),
  );
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  // Local fallback so selection still reads in the lab, where the demo wires no
  // `url_selection` binding (mirrors ArtifactWorkbench's resolved/local split).
  const [localSelectedId, setLocalSelectedId] = useState<string | null>(null);
  const selectedId = selection?.selectedId ?? localSelectedId;

  const today = useMemo(() => startOfDay(new Date()), []);
  const todayTime = today.getTime();

  const { events, undatedCount } = useMemo(() => {
    let undated = 0;
    const parsed: CalEvent[] = [];
    for (const node of nodes) {
      const start = parseDate(readField(node, dateField));
      if (!start) {
        undated += 1;
        continue;
      }
      const rawEnd = endField ? parseDate(readField(node, endField)) : null;
      const end = rawEnd && rawEnd.getTime() >= start.getTime() ? rawEnd : start;
      parsed.push({
        node,
        start: start.getTime(),
        end: end.getTime(),
        token: colorField ? asColorToken(readField(node, colorField)) : DEFAULT_EVENT_TOKEN,
        title: String(readField(node, titleField) ?? node.title ?? ""),
      });
    }
    return { events: parsed, undatedCount: undated };
  }, [nodes, dateField, endField, titleField, colorField]);

  const cells = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1);
    const gridStart = new Date(cursor.year, cursor.month, 1 - first.getDay());
    return Array.from(
      { length: 42 },
      (_, i) =>
        new Date(
          gridStart.getFullYear(),
          gridStart.getMonth(),
          gridStart.getDate() + i,
        ),
    );
  }, [cursor]);

  const monthStart = new Date(cursor.year, cursor.month, 1).getTime();
  const monthEnd = new Date(cursor.year, cursor.month + 1, 0).getTime();
  const eventsThisMonth = events.filter(
    (e) => e.start <= monthEnd && e.end >= monthStart,
  ).length;

  const goPrev = () =>
    setCursor((c) =>
      c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 },
    );
  const goNext = () =>
    setCursor((c) =>
      c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 },
    );
  const goToday = () =>
    setCursor({ year: today.getFullYear(), month: today.getMonth() });

  const selectEvent = (node: RenderNode) => {
    if (selection) selection.setSelectedId(node.id);
    else setLocalSelectedId(node.id);
    if (onAction && selectAction) void onAction(selectAction, { nodeId: node.id });
  };

  // No events at all (and nothing undated) → a real empty state with guidance.
  if (events.length === 0 && undatedCount === 0) {
    return (
      <Empty data-testid="calendar-view" data-state="empty" className="rounded-lg border border-dashed py-10">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarBlankIcon className="size-5" />
          </EmptyMedia>
          <EmptyTitle>표시할 일정이 없습니다</EmptyTitle>
          <EmptyDescription>
            {dateField} 값이 있는 항목을 추가하면 이 달력에 배치됩니다.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div data-testid="calendar-view" className="flex flex-col gap-3">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarBlankIcon className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold tabular-nums">
            {cursor.year}년 {cursor.month + 1}월
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" size="sm" variant="outline" onClick={goToday}>
            오늘
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-label="이전 달"
            onClick={goPrev}
          >
            <CaretLeftIcon className="size-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-label="다음 달"
            onClick={goNext}
          >
            <CaretRightIcon className="size-4" />
          </Button>
        </div>
      </header>

      {eventsThisMonth === 0 ? (
        <p className="text-xs text-muted-foreground">
          이 달에는 일정이 없습니다. 좌우 화살표로 다른 달을 확인하세요.
        </p>
      ) : null}

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border">
        {WEEKDAYS.map((label) => (
          <div
            key={label}
            className="bg-muted/40 px-2 py-1.5 text-center text-[11px] font-medium text-muted-foreground"
          >
            {label}
          </div>
        ))}
        {cells.map((cell) => {
          const dayKey = toDayKey(cell);
          const inMonth = cell.getMonth() === cursor.month;
          const isToday = cell.getTime() === todayTime;
          const t = cell.getTime();
          const dayEvents = events
            .filter((e) => e.start <= t && t <= e.end)
            .sort((a, b) => a.start - b.start || a.title.localeCompare(b.title));
          const expanded = expandedDay === dayKey;
          const visible = expanded
            ? dayEvents
            : dayEvents.slice(0, MAX_VISIBLE_PER_DAY);
          const overflow = dayEvents.length - visible.length;

          return (
            <div
              key={dayKey}
              className={cn(
                "flex min-h-[84px] flex-col gap-1 p-1.5 sm:min-h-[96px]",
                inMonth ? "bg-background" : "bg-muted/40",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full text-xs tabular-nums",
                    isToday
                      ? "bg-primary font-semibold text-primary-foreground"
                      : inMonth
                        ? "text-foreground"
                        : "text-muted-foreground",
                  )}
                >
                  {cell.getDate()}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                {visible.map((event) => (
                  <EventChip
                    key={event.node.id}
                    title={event.title}
                    token={event.token}
                    selected={event.node.id === selectedId}
                    onSelect={() => selectEvent(event.node)}
                  />
                ))}
                {overflow > 0 ? (
                  <button
                    type="button"
                    onClick={() => setExpandedDay(expanded ? null : dayKey)}
                    className="w-full rounded px-1.5 text-left text-[11px] font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    +{overflow}개 더
                  </button>
                ) : null}
                {expanded && dayEvents.length > MAX_VISIBLE_PER_DAY ? (
                  <button
                    type="button"
                    onClick={() => setExpandedDay(null)}
                    className="w-full rounded px-1.5 text-left text-[11px] font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    접기
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {undatedCount > 0 ? (
        <p className="text-xs text-muted-foreground">
          {undatedCount}건은 날짜가 없어 표시되지 않았습니다.
        </p>
      ) : null}
    </div>
  );
}

/**
 * CalendarView catalog component (hook-free coercion fn → `<CalendarViewEl/>`).
 * `binding` is a multi-node query; each node is placed by `dateField`
 * (default "date"), optionally spanning to `endField`, titled by `titleField`
 * (default "title"), and tinted by `colorField` (a flow color token).
 */
export const calendarComponents: Record<string, CatalogComponent> = {
  CalendarView: ({ props, bindingData }) => (
    <CalendarViewEl
      nodes={boundNodes(bindingData, props)}
      dateField={typeof props.dateField === "string" ? props.dateField : "date"}
      endField={typeof props.endField === "string" ? props.endField : undefined}
      titleField={typeof props.titleField === "string" ? props.titleField : "title"}
      colorField={typeof props.colorField === "string" ? props.colorField : undefined}
      selectAction={
        typeof props.selectAction === "string" ? props.selectAction : undefined
      }
      initialMonth={
        typeof props.initialMonth === "string" ? props.initialMonth : undefined
      }
    />
  ),
};
