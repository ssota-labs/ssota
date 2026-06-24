"use client";

import * as React from "react";
import {
  CaretDownIcon,
  CheckIcon,
  EyeIcon,
  FunnelSimpleIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";
import { Avatar, AvatarFallback, AvatarImage } from "@ssota/ui/components/ui/avatar";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import { Input } from "@ssota/ui/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ssota/ui/components/ui/popover";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@ssota/ui/components/ui/context-menu";
import { useAction } from "../context";
import { boundNodes } from "../bindings";
import type { CatalogComponent, RenderNode } from "../types";

// ── timeline scale ───────────────────────────────────────────────────────────

type Range = "day" | "week" | "month";

/** Pixels per calendar day for each zoom level. */
const PX_PER_DAY: Record<Range, number> = { day: 34, week: 13, month: 5 };
const HEADER_H = 36; // tick header / sidebar corner
const GROUP_H = 32; // swim-lane group header
const ROW_H = 36; // one feature row
const BAR_H = 24;
const SIDEBAR_W = 224;

const DAY_MS = 86_400_000;

type GanttMarker = { date: Date; label: string; color?: string };

/** A filterable column surfaced in the Notion-style filter popover. */
type FilterField =
  | { id: "title"; label: string; kind: "text" }
  | {
      id: "status" | "group";
      label: string;
      kind: "select";
      options: string[];
      colors?: Record<string, string>;
    };
/** The current value of an active filter (text `contains`, or `is any of`). */
type FilterValue = { text?: string; values?: string[] };

type Feature = {
  node: RenderNode;
  start: Date;
  end: Date;
  status?: string;
  group: string;
  owner?: string;
  ownerImage?: string;
};

// ── date helpers (no external date lib — keeps the catalog dependency-free) ──

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}
function diffDays(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY_MS);
}
function startOfWeek(d: Date): Date {
  const s = startOfDay(d);
  return addDays(s, -((s.getDay() + 6) % 7)); // Monday-first
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function snapStart(d: Date, range: Range): Date {
  return range === "month" ? startOfMonth(d) : range === "week" ? startOfWeek(d) : startOfDay(d);
}
function snapEnd(d: Date, range: Range): Date {
  return range === "month"
    ? addMonths(startOfMonth(d), 1)
    : range === "week"
      ? addDays(startOfWeek(d), 7)
      : addDays(startOfDay(d), 1);
}
function nextTick(d: Date, range: Range): Date {
  return range === "month" ? addMonths(d, 1) : range === "week" ? addDays(d, 7) : addDays(d, 1);
}
// Fixed (locale-independent) month names so server and client render identical
// tick labels — `toLocaleDateString` would differ by runtime locale and break
// hydration (server en vs. browser ko).
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
function tickLabel(d: Date, range: Range): string {
  if (range === "month") return `${MONTH_NAMES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
  if (range === "week") return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
  return String(d.getDate());
}
function toISODate(d: Date): string {
  return startOfDay(d).toISOString().slice(0, 10);
}

// ── small util ───────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type DragState = {
  id: string;
  mode: "move" | "resize-l" | "resize-r";
  startX: number;
  origStart: Date;
  origEnd: Date;
  days: number;
};

function GanttEl({
  nodes,
  startKey,
  endKey,
  groupKey,
  statusKey,
  statusColors,
  ownerKey,
  ownerImageKey,
  title,
  range: initialRange,
  markers,
  rowAction,
  moveAction,
  removeAction,
}: {
  nodes: RenderNode[];
  startKey: string;
  endKey: string;
  groupKey?: string;
  statusKey?: string;
  statusColors?: Record<string, string>;
  ownerKey?: string;
  ownerImageKey?: string;
  title?: string;
  range: Range;
  markers?: GanttMarker[];
  rowAction?: string;
  moveAction?: string;
  removeAction?: string;
}) {
  const onAction = useAction();
  const today = React.useMemo(() => startOfDay(new Date()), []);

  // Parse nodes → features. Local date overrides let drag-to-reschedule reflect
  // immediately (the same pattern DataTable uses for inline edits).
  const [overrides, setOverrides] = React.useState<
    Record<string, { start: Date; end: Date }>
  >({});
  const [removed, setRemoved] = React.useState<Set<string>>(() => new Set());

  const prop = React.useCallback(
    (node: RenderNode, key: string | undefined): unknown =>
      key ? (key === "title" ? node.title : node.properties?.[key]) : undefined,
    [],
  );

  const features = React.useMemo<Feature[]>(() => {
    const out: Feature[] = [];
    for (const node of nodes) {
      if (removed.has(node.id)) continue;
      const start = toDate(prop(node, startKey));
      const end = toDate(prop(node, endKey));
      if (!start || !end) continue; // can't place undated work on the axis
      const status = statusKey ? String(prop(node, statusKey) ?? "") || undefined : undefined;
      const owner = ownerKey ? String(prop(node, ownerKey) ?? "") || undefined : undefined;
      const ownerImage = ownerImageKey
        ? String(prop(node, ownerImageKey) ?? "") || undefined
        : undefined;
      const group = groupKey ? String(prop(node, groupKey) ?? "Ungrouped") : "";
      out.push({
        node,
        start: startOfDay(start),
        end: startOfDay(end < start ? start : end),
        status,
        owner,
        ownerImage,
        group,
      });
    }
    return out;
  }, [nodes, removed, prop, startKey, endKey, statusKey, ownerKey, ownerImageKey, groupKey]);

  // ── filtering (Notion-style popover facets) ────────────────────────────────
  const [range, setRange] = React.useState<Range>(initialRange);
  const [filters, setFilters] = React.useState<Record<string, FilterValue>>({});
  const [openFilter, setOpenFilter] = React.useState<string | null>(null);
  const [addOpen, setAddOpen] = React.useState(false);

  const allStatuses = React.useMemo(
    () => [...new Set(features.map((f) => f.status).filter((s): s is string => !!s))].sort(),
    [features],
  );
  const allGroups = React.useMemo(
    () => (groupKey ? [...new Set(features.map((f) => f.group))].sort() : []),
    [features, groupKey],
  );

  const fields = React.useMemo<FilterField[]>(() => {
    const arr: FilterField[] = [{ id: "title", label: "Name", kind: "text" }];
    if (allStatuses.length)
      arr.push({
        id: "status",
        label: "Status",
        kind: "select",
        options: allStatuses,
        colors: statusColors,
      });
    if (groupKey && allGroups.length)
      arr.push({ id: "group", label: "Group", kind: "select", options: allGroups });
    return arr;
  }, [allStatuses, allGroups, groupKey, statusColors]);

  const activeIds = Object.keys(filters);
  const hasFilter = activeIds.length > 0;

  const visible = React.useMemo(
    () =>
      features.filter((f) => {
        for (const id of Object.keys(filters)) {
          const v = filters[id];
          if (!v) continue;
          if (id === "title") {
            const t = (v.text ?? "").trim().toLowerCase();
            if (t && !f.node.title.toLowerCase().includes(t)) return false;
          } else {
            const vals = v.values ?? [];
            const cell = id === "status" ? f.status : f.group;
            if (vals.length && (!cell || !vals.includes(cell))) return false;
          }
        }
        return true;
      }),
    [features, filters],
  );

  const addFilter = (id: string) => {
    setFilters((prev) =>
      id in prev ? prev : { ...prev, [id]: id === "title" ? { text: "" } : { values: [] } },
    );
    setAddOpen(false);
    setOpenFilter(id);
  };
  const removeFilter = (id: string) => {
    setFilters((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setOpenFilter((cur) => (cur === id ? null : cur));
  };
  const setFilterText = (id: string, text: string) =>
    setFilters((prev) => ({ ...prev, [id]: { text } }));
  const toggleFilterValue = (id: string, value: string) =>
    setFilters((prev) => {
      const vals = new Set(prev[id]?.values ?? []);
      if (vals.has(value)) vals.delete(value);
      else vals.add(value);
      return { ...prev, [id]: { values: [...vals] } };
    });
  const clearFilters = () => {
    setFilters({});
    setOpenFilter(null);
  };

  // ── timeline domain (stable: derived from ALL features, not the filtered set) ─
  const domain = React.useMemo(() => {
    const dates = features.flatMap((f) => [f.start, f.end]);
    dates.push(today);
    const min = new Date(Math.min(...dates.map((d) => d.getTime())));
    const max = new Date(Math.max(...dates.map((d) => d.getTime())));
    const domainStart = snapStart(addDays(min, -2), range);
    const domainEnd = snapEnd(addDays(max, 2), range);
    return { domainStart, domainEnd };
  }, [features, today, range]);

  const pxPerDay = PX_PER_DAY[range];
  const totalDays = Math.max(diffDays(domain.domainStart, domain.domainEnd), 1);
  const timelineWidth = totalDays * pxPerDay;
  const x = React.useCallback(
    (d: Date) => diffDays(domain.domainStart, d) * pxPerDay,
    [domain.domainStart, pxPerDay],
  );

  const ticks = React.useMemo(() => {
    const out: Date[] = [];
    let cur = domain.domainStart;
    let guard = 0;
    while (cur < domain.domainEnd && guard++ < 1000) {
      out.push(cur);
      cur = nextTick(cur, range);
    }
    return out;
  }, [domain, range]);

  // ── grouped rows ───────────────────────────────────────────────────────────
  const grouped = React.useMemo(() => {
    const map = new Map<string, Feature[]>();
    for (const f of visible) {
      const list = map.get(f.group) ?? [];
      list.push(f);
      map.set(f.group, list);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, items]) => ({
        name,
        items: items.sort((a, b) => a.start.getTime() - b.start.getTime()),
      }));
  }, [visible]);

  // ── drag to reschedule (only when a moveAction is wired) ───────────────────
  const [drag, setDrag] = React.useState<DragState | null>(null);

  const resolved = React.useCallback(
    (f: Feature): { start: Date; end: Date } => {
      const o = overrides[f.node.id];
      let start = o?.start ?? f.start;
      let end = o?.end ?? f.end;
      if (drag && drag.id === f.node.id && drag.days !== 0) {
        if (drag.mode === "move") {
          start = addDays(drag.origStart, drag.days);
          end = addDays(drag.origEnd, drag.days);
        } else if (drag.mode === "resize-l") {
          start = addDays(drag.origStart, drag.days);
          if (diffDays(start, end) < 0) start = end;
        } else {
          end = addDays(drag.origEnd, drag.days);
          if (diffDays(start, end) < 0) end = start;
        }
      }
      return { start, end };
    },
    [overrides, drag],
  );

  const beginDrag = (e: React.PointerEvent, f: Feature, mode: DragState["mode"]) => {
    if (!moveAction) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const r = resolved(f);
    setDrag({ id: f.node.id, mode, startX: e.clientX, origStart: r.start, origEnd: r.end, days: 0 });
  };
  const moveDrag = (e: React.PointerEvent) => {
    setDrag((d) => (d ? { ...d, days: Math.round((e.clientX - d.startX) / pxPerDay) } : d));
  };
  const endDrag = (e: React.PointerEvent, f: Feature) => {
    if (!drag || drag.id !== f.node.id) return;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    if (drag.days !== 0) {
      const next = resolved(f);
      setOverrides((prev) => ({ ...prev, [f.node.id]: next }));
      if (onAction && moveAction) {
        void onAction(moveAction, {
          nodeId: f.node.id,
          startAt: toISODate(next.start),
          endAt: toISODate(next.end),
        });
      }
    } else if (onAction && rowAction) {
      void onAction(rowAction, { nodeId: f.node.id }); // treat a no-move press as a click
    }
    setDrag(null);
  };

  const fireRow = (id: string) => {
    if (onAction && rowAction) void onAction(rowAction, { nodeId: id });
  };
  const fireRemove = (id: string) => {
    setRemoved((prev) => new Set(prev).add(id));
    if (onAction && removeAction) void onAction(removeAction, { nodeId: id });
  };

  const todayX = today >= domain.domainStart && today <= domain.domainEnd ? x(today) : null;
  const validMarkers = (markers ?? []).filter(
    (m) => m.date >= domain.domainStart && m.date <= domain.domainEnd,
  );

  const draggable = !!moveAction;

  return (
    <div className="space-y-2">
      {title ? <h2 className="text-sm font-medium">{title}</h2> : null}

      {/* ── filter toolbar (Notion-style popovers) ──────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* active filter pills */}
        {activeIds.map((id) => {
          const field = fields.find((f) => f.id === id);
          if (!field) return null;
          return (
            <GanttFilterPill
              key={id}
              field={field}
              value={filters[id] ?? {}}
              open={openFilter === id}
              onOpenChange={(o) => setOpenFilter(o ? id : null)}
              onText={(t) => setFilterText(id, t)}
              onToggleValue={(v) => toggleFilterValue(id, v)}
              onRemove={() => removeFilter(id)}
            />
          );
        })}

        {/* add-filter popover */}
        <Popover open={addOpen} onOpenChange={setAddOpen}>
          <PopoverTrigger
            render={
              <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2 text-xs" />
            }
          >
            <FunnelSimpleIcon className="size-3.5" />
            {hasFilter ? "Filter" : "Filter"}
            {hasFilter ? (
              <span className="bg-primary size-1.5 rounded-full" aria-hidden />
            ) : null}
          </PopoverTrigger>
          <PopoverContent align="start" className="w-52 !flex-col !gap-0 !p-1">
            <p className="text-muted-foreground px-2 py-1 text-[11px] font-medium">Filter by…</p>
            {fields
              .filter((f) => !(f.id in filters))
              .map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => addFilter(f.id)}
                  className="hover:bg-muted/60 flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-sm"
                >
                  <span className="text-muted-foreground w-4 text-center text-xs">
                    {f.kind === "text" ? "Aa" : "◔"}
                  </span>
                  {f.label}
                </button>
              ))}
            {fields.every((f) => f.id in filters) ? (
              <p className="text-muted-foreground px-2 py-1 text-[11px]">All filters added.</p>
            ) : null}
          </PopoverContent>
        </Popover>

        {hasFilter ? (
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={clearFilters}>
            <XIcon className="size-3.5" />
            Reset
          </Button>
        ) : null}

        <div className="ml-auto inline-flex items-center gap-1">
          <div className="bg-muted/60 inline-flex rounded-md p-0.5">
            {(["day", "week", "month"] as Range[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`rounded px-2 py-0.5 text-xs capitalize transition-colors ${
                  range === r
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── chart ───────────────────────────────────────────────────────── */}
      <div className="border-border bg-background overflow-auto rounded-lg border">
        <div className="flex" style={{ width: SIDEBAR_W + timelineWidth }}>
          {/* sidebar */}
          <div
            className="bg-background sticky left-0 z-20 shrink-0 border-r"
            style={{ width: SIDEBAR_W }}
          >
            <div
              className="bg-muted/40 text-muted-foreground flex items-center px-3 text-xs font-medium"
              style={{ height: HEADER_H }}
            >
              {visible.length} item{visible.length === 1 ? "" : "s"}
            </div>
            {grouped.map((g) => (
              <div key={g.name || "__all"}>
                {g.name ? (
                  <div
                    className="text-muted-foreground bg-muted/20 flex items-center px-3 text-xs font-semibold tracking-wide uppercase"
                    style={{ height: GROUP_H }}
                  >
                    <span className="truncate">{g.name}</span>
                  </div>
                ) : null}
                {g.items.map((f) => (
                  <button
                    key={f.node.id}
                    type="button"
                    onClick={() => fireRow(f.node.id)}
                    className="hover:bg-muted/40 flex w-full items-center gap-2 px-3 text-left"
                    style={{ height: ROW_H }}
                  >
                    {f.owner ? (
                      <Avatar className="!size-4 shrink-0">
                        {f.ownerImage ? <AvatarImage src={f.ownerImage} alt={f.owner} /> : null}
                        <AvatarFallback className="text-[8px]">
                          {initials(f.owner)}
                        </AvatarFallback>
                      </Avatar>
                    ) : null}
                    <span className="truncate text-xs">{f.node.title}</span>
                  </button>
                ))}
              </div>
            ))}
            {grouped.length === 0 ? (
              <div
                className="text-muted-foreground flex items-center px-3 text-xs"
                style={{ height: ROW_H }}
              >
                No items
              </div>
            ) : null}
          </div>

          {/* timeline */}
          <div className="relative" style={{ width: timelineWidth }}>
            {/* tick header */}
            <div
              className="bg-muted/40 text-muted-foreground sticky top-0 z-10 border-b"
              style={{ height: HEADER_H }}
            >
              {ticks.map((t, i) => (
                <div
                  key={i}
                  className="absolute top-0 flex h-full items-center border-l px-1.5 text-[11px] whitespace-nowrap"
                  style={{ left: x(t) }}
                >
                  {tickLabel(t, range)}
                </div>
              ))}
            </div>

            {/* body */}
            <div className="relative">
              {/* gridlines */}
              {ticks.map((t, i) => (
                <div
                  key={i}
                  className="border-border/50 pointer-events-none absolute top-0 bottom-0 border-l"
                  style={{ left: x(t) }}
                />
              ))}

              {/* today */}
              {todayX !== null ? (
                <div
                  className="bg-primary/70 pointer-events-none absolute top-0 bottom-0 z-0 w-px"
                  style={{ left: todayX }}
                >
                  <span className="bg-primary text-primary-foreground absolute top-0 left-0 rounded-br px-1 py-px text-[9px] font-medium">
                    Today
                  </span>
                </div>
              ) : null}

              {/* markers */}
              {validMarkers.map((m, i) => (
                <div
                  key={i}
                  className="pointer-events-none absolute top-0 bottom-0 z-0 w-px border-l border-dashed"
                  style={{ left: x(m.date), borderColor: m.color ?? "var(--muted-foreground)" }}
                >
                  <span
                    className="absolute top-0 left-0 rounded-br px-1 py-px text-[9px] font-medium text-white"
                    style={{ backgroundColor: m.color ?? "var(--muted-foreground)" }}
                  >
                    {m.label}
                  </span>
                </div>
              ))}

              {/* rows */}
              {grouped.map((g) => (
                <div key={g.name || "__all"}>
                  {g.name ? <div style={{ height: GROUP_H }} /> : null}
                  {g.items.map((f) => {
                    const r = resolved(f);
                    const left = x(r.start);
                    const width = Math.max((diffDays(r.start, r.end) + 1) * pxPerDay, 8);
                    const bg = (f.status && statusColors?.[f.status]) || undefined;
                    const isDragging = drag?.id === f.node.id;
                    return (
                      <div key={f.node.id} className="relative" style={{ height: ROW_H }}>
                        <ContextMenu>
                          <ContextMenuTrigger
                            render={
                              <div
                                role="button"
                                tabIndex={0}
                                onPointerDown={(e) => beginDrag(e, f, "move")}
                                onPointerMove={moveDrag}
                                onPointerUp={(e) => endDrag(e, f)}
                                onClick={() => {
                                  if (!draggable) fireRow(f.node.id);
                                }}
                                className={`group text-foreground absolute z-10 flex items-center gap-1.5 overflow-hidden rounded-md border px-2 text-xs select-none ${
                                  bg ? "" : "border-primary/30 bg-primary/15"
                                } ${draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"} ${
                                  isDragging ? "ring-primary/50 shadow-md ring-2" : ""
                                }`}
                                style={{
                                  left,
                                  width,
                                  top: (ROW_H - BAR_H) / 2,
                                  height: BAR_H,
                                  // Tint the bar with the status hue rather than a
                                  // solid fill, so `text-foreground` stays legible in
                                  // both light and dark themes.
                                  ...(bg
                                    ? {
                                        backgroundColor: `color-mix(in oklab, ${bg} 25%, transparent)`,
                                        borderColor: `color-mix(in oklab, ${bg} 50%, transparent)`,
                                      }
                                    : null),
                                }}
                              />
                            }
                          >
                            {draggable ? (
                              <span
                                onPointerDown={(e) => beginDrag(e, f, "resize-l")}
                                className="absolute inset-y-0 left-0 w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100"
                              />
                            ) : null}
                            <span className="flex-1 truncate">{f.node.title}</span>
                            {f.owner ? (
                              <Avatar className="!size-4 shrink-0">
                                {f.ownerImage ? (
                                  <AvatarImage src={f.ownerImage} alt={f.owner} />
                                ) : null}
                                <AvatarFallback className="text-[8px]">
                                  {initials(f.owner)}
                                </AvatarFallback>
                              </Avatar>
                            ) : null}
                            {draggable ? (
                              <span
                                onPointerDown={(e) => beginDrag(e, f, "resize-r")}
                                className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100"
                              />
                            ) : null}
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuItem
                              className="flex items-center gap-2"
                              onClick={() => fireRow(f.node.id)}
                            >
                              <EyeIcon className="text-muted-foreground size-4" />
                              View
                            </ContextMenuItem>
                            {removeAction ? (
                              <ContextMenuItem
                                variant="destructive"
                                className="flex items-center gap-2"
                                onClick={() => fireRemove(f.node.id)}
                              >
                                <TrashIcon className="size-4" />
                                Remove
                              </ContextMenuItem>
                            ) : null}
                          </ContextMenuContent>
                        </ContextMenu>
                      </div>
                    );
                  })}
                </div>
              ))}

              {grouped.length === 0 ? (
                <div
                  className="text-muted-foreground flex items-center px-3 text-xs"
                  style={{ height: ROW_H }}
                >
                  {features.length === 0
                    ? "No dated items to chart."
                    : "No items match the current filters."}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {hasFilter ? (
        <p className="text-muted-foreground text-xs">
          Showing {visible.length} of {features.length} items.
        </p>
      ) : null}
    </div>
  );
}

/** Short human summary of a filter's current value, shown on its pill. */
function filterSummary(field: FilterField, value: FilterValue): string {
  if (field.kind === "text") {
    const t = (value.text ?? "").trim();
    return t ? `contains "${t}"` : "contains…";
  }
  const vals = value.values ?? [];
  if (vals.length === 0) return "is any";
  if (vals.length <= 2) return `is ${vals.join(", ")}`;
  return `is ${vals.length} selected`;
}

/**
 * One active filter rendered as a Notion-style pill that opens a popover editor:
 * a text `contains` input, or a multi-select `is any of` checklist.
 */
function GanttFilterPill({
  field,
  value,
  open,
  onOpenChange,
  onText,
  onToggleValue,
  onRemove,
}: {
  field: FilterField;
  value: FilterValue;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onText: (text: string) => void;
  onToggleValue: (value: string) => void;
  onRemove: () => void;
}) {
  const filled =
    field.kind === "text"
      ? !!(value.text ?? "").trim()
      : (value.values ?? []).length > 0;
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={`inline-flex h-8 items-center gap-1 rounded-md border px-2 text-xs ${
              filled
                ? "border-primary/40 bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:bg-muted/50"
            }`}
          />
        }
      >
        <span className="font-medium">{field.label}</span>
        <span className="text-muted-foreground">{filterSummary(field, value)}</span>
        <CaretDownIcon className="size-3" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 p-0">
        <div className="flex items-center justify-between border-b px-2 py-1.5">
          <span className="text-xs font-medium">
            {field.label}{" "}
            <span className="text-muted-foreground">
              {field.kind === "text" ? "contains" : "is any of"}
            </span>
          </span>
          <button
            type="button"
            onClick={onRemove}
            className="text-muted-foreground hover:text-destructive inline-flex size-5 items-center justify-center rounded"
            aria-label="Remove filter"
          >
            <TrashIcon className="size-3.5" />
          </button>
        </div>
        <div className="p-1.5">
          {field.kind === "text" ? (
            <Input
              autoFocus
              value={value.text ?? ""}
              onChange={(e) => onText(e.target.value)}
              placeholder="Type a value…"
              className="h-8 text-sm"
            />
          ) : (
            <div className="max-h-56 space-y-0.5 overflow-y-auto">
              {field.options.map((opt) => {
                const on = (value.values ?? []).includes(opt);
                const color = field.colors?.[opt];
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => onToggleValue(opt)}
                    className="hover:bg-muted/60 flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-sm"
                  >
                    <span className="flex size-4 shrink-0 items-center justify-center">
                      {on ? <CheckIcon className="size-3.5" /> : null}
                    </span>
                    <Badge
                      variant={color ? "default" : "secondary"}
                      className="rounded px-1.5 py-0.5 text-[11px] font-normal"
                      style={color ? { backgroundColor: color, color: "var(--foreground)" } : undefined}
                    >
                      {opt}
                    </Badge>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function str(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}
function optStr(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
function parseMarkers(value: unknown): GanttMarker[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: GanttMarker[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const m = raw as Record<string, unknown>;
    const date = toDate(m.date);
    if (!date) continue;
    out.push({
      date: startOfDay(date),
      label: typeof m.label === "string" ? m.label : "",
      color: typeof m.color === "string" ? m.color : undefined,
    });
  }
  return out;
}

/** Gantt / timeline chart for the JSON-render catalog. */
export const ganttComponents: Record<string, CatalogComponent> = {
  Gantt: ({ props, bindingData }) => (
    <GanttEl
      nodes={boundNodes(bindingData, props)}
      startKey={str(props.startKey, "startAt")}
      endKey={str(props.endKey, "endAt")}
      groupKey={optStr(props.groupKey)}
      statusKey={optStr(props.statusKey)}
      statusColors={
        props.statusColors && typeof props.statusColors === "object"
          ? (props.statusColors as Record<string, string>)
          : undefined
      }
      ownerKey={optStr(props.ownerKey)}
      ownerImageKey={optStr(props.ownerImageKey)}
      title={optStr(props.title)}
      range={
        props.range === "day" || props.range === "week" || props.range === "month"
          ? props.range
          : "month"
      }
      markers={parseMarkers(props.markers)}
      rowAction={optStr(props.rowAction)}
      moveAction={optStr(props.moveAction)}
      removeAction={optStr(props.removeAction)}
    />
  ),
};
