"use client";

import { Card } from "@ssota/ui/components/ui/card";
import { cn } from "@ssota/ui/lib/utils";
import { boundNodes } from "../bindings";
import { flowColorClasses } from "../flow-tokens";
import type { CatalogComponent, RenderNode } from "../types";

/**
 * KPI dashboard tiles for the json-render catalog (§B4).
 *
 * `StatTile` is a single KPI: a big aggregated value + label + optional delta
 * chip and sparkline. `StatRow` is a responsive grid wrapper of tiles. Both are
 * domain-agnostic — the value comes from a graph binding (a multi-node `query`
 * to aggregate, or a single `node`/`singleton`), so the same tiles serve MRR,
 * velocity, net-worth, ticket counts, etc.
 *
 * Delta up/down colors reuse the shared `flow-tokens` palette (green = up,
 * red = down) — no raw hex / Tailwind palette in this file. Everything else is
 * built on the `@ssota/ui` Card primitive + semantic tokens ([DS-01/02/03]).
 */

type StatFormat = "number" | "currency" | "percent";
type StatAggregate = "count" | "sum" | "avg";

const AGGREGATES: readonly StatAggregate[] = ["count", "sum", "avg"];
const FORMATS: readonly StatFormat[] = ["number", "currency", "percent"];

function isAggregate(value: unknown): value is StatAggregate {
  return typeof value === "string" && (AGGREGATES as readonly string[]).includes(value);
}
function isFormat(value: unknown): value is StatFormat {
  return typeof value === "string" && (FORMATS as readonly string[]).includes(value);
}

/** Read a numeric node property (title or `properties[field]`); coerces strings. */
function readNumber(node: RenderNode, field: string): number | undefined {
  const raw =
    field === "title"
      ? node.title
      : (node.properties as Record<string, unknown>)?.[field];
  const n =
    typeof raw === "number"
      ? raw
      : typeof raw === "string" && raw.trim() !== ""
        ? Number(raw)
        : Number.NaN;
  return Number.isFinite(n) ? n : undefined;
}

/** Aggregate `valueField` across the bound nodes. No field ⇒ count. */
function aggregateValue(
  nodes: RenderNode[],
  valueField: string | undefined,
  kind: StatAggregate,
): number | undefined {
  if (kind === "count") return nodes.length;
  if (!valueField) return nodes.length;
  const values = nodes
    .map((n) => readNumber(n, valueField))
    .filter((v): v is number => v !== undefined);
  if (values.length === 0) return undefined;
  const sum = values.reduce((a, b) => a + b, 0);
  return kind === "avg" ? sum / values.length : sum;
}

/** Coerce an unknown array (numbers, numeric strings, or `{ value }` rows). */
function coerceSeries(raw: unknown[]): number[] {
  const unwrap = (item: unknown): unknown =>
    item && typeof item === "object" && "value" in item
      ? (item as { value: unknown }).value
      : item;
  return raw
    .map((item) => {
      const v = unwrap(item);
      return typeof v === "number" ? v : typeof v === "string" ? Number(v) : Number.NaN;
    })
    .filter((v) => Number.isFinite(v));
}

/**
 * Resolve the sparkline series:
 * 1. an explicit `sparkline` array prop, else
 * 2. an array property (`sparklineField`) on the first bound node, else
 * 3. the distribution of `valueField` across a multi-node binding.
 */
function resolveSparkline(
  nodes: RenderNode[],
  sparklineField: string | undefined,
  sparklineProp: unknown[] | undefined,
  valueField: string | undefined,
): number[] | undefined {
  if (sparklineProp) {
    const s = coerceSeries(sparklineProp);
    return s.length > 1 ? s : undefined;
  }
  if (sparklineField && nodes[0]) {
    const raw = (nodes[0].properties as Record<string, unknown>)?.[sparklineField];
    if (Array.isArray(raw)) {
      const s = coerceSeries(raw);
      return s.length > 1 ? s : undefined;
    }
  }
  if (valueField && nodes.length > 1) {
    const s = nodes
      .map((n) => readNumber(n, valueField))
      .filter((v): v is number => v !== undefined);
    return s.length > 1 ? s : undefined;
  }
  return undefined;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
}

function formatValue(
  value: number,
  format: StatFormat,
  unit: string | undefined,
  currency: string,
): string {
  if (format === "percent") return `${formatNumber(value)}%`;
  if (format === "currency") {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(value);
    } catch {
      return formatNumber(value);
    }
  }
  const base = formatNumber(value);
  return unit ? `${base} ${unit}` : base;
}

function formatDelta(delta: number, format: StatFormat): string {
  const magnitude = Math.abs(delta);
  return format === "percent" ? `${formatNumber(magnitude)}%` : formatNumber(magnitude);
}

/** Tiny inline SVG sparkline (no chart dep). Colored by the parent's text color. */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const width = 100;
  const height = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / span) * height;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-7 w-full"
      role="img"
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** Single KPI tile. Pure/presentational — the catalog fn resolves the binding. */
function StatTileEl({
  label,
  nodes,
  valueField,
  aggregate,
  format,
  unit,
  currency,
  deltaField,
  deltaValue,
  sparklineField,
  sparkline,
  loading,
}: {
  label: string;
  nodes: RenderNode[];
  valueField?: string;
  aggregate?: StatAggregate;
  format: StatFormat;
  unit?: string;
  currency: string;
  deltaField?: string;
  deltaValue?: number;
  sparklineField?: string;
  sparkline?: unknown[];
  loading: boolean;
}) {
  const kind: StatAggregate = aggregate ?? (valueField ? "sum" : "count");
  const value = aggregateValue(nodes, valueField, kind);
  const series = resolveSparkline(nodes, sparklineField, sparkline, valueField);
  const delta =
    typeof deltaValue === "number"
      ? deltaValue
      : deltaField && nodes[0]
        ? readNumber(nodes[0], deltaField)
        : undefined;

  const trend =
    delta == null || delta === 0 ? "flat" : delta > 0 ? "up" : "down";
  const trendClasses =
    trend === "up"
      ? flowColorClasses("green")
      : trend === "down"
        ? flowColorClasses("red")
        : null;

  const labelEl = (
    <div className="text-muted-foreground truncate text-xs font-medium">{label}</div>
  );

  if (loading) {
    return (
      <Card data-testid="stat-tile" data-state="loading" className="gap-2 p-4">
        {labelEl}
        <div className="bg-muted h-7 w-24 animate-pulse rounded" />
        <div className="bg-muted h-7 w-full animate-pulse rounded" />
      </Card>
    );
  }

  if (value === undefined) {
    return (
      <Card data-testid="stat-tile" data-state="empty" className="gap-1 p-4">
        {labelEl}
        <div className="text-muted-foreground text-2xl font-semibold tabular-nums">
          —
        </div>
        <div className="text-muted-foreground text-xs">No data yet</div>
      </Card>
    );
  }

  return (
    <Card data-testid="stat-tile" className="gap-2 p-4">
      {labelEl}
      <div className="flex items-baseline gap-2">
        <span className="text-foreground text-2xl font-semibold tabular-nums">
          {formatValue(value, format, unit, currency)}
        </span>
        {delta != null ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium tabular-nums",
              trendClasses
                ? cn(trendClasses.surface, trendClasses.text)
                : "bg-muted text-muted-foreground",
            )}
          >
            <span aria-hidden>
              {trend === "up" ? "▲" : trend === "down" ? "▼" : "•"}
            </span>
            {formatDelta(delta, format)}
          </span>
        ) : null}
      </div>
      {series ? (
        <span className={cn("block", trendClasses?.text ?? "text-muted-foreground")}>
          <Sparkline values={series} />
        </span>
      ) : null}
    </Card>
  );
}

/** KPI stat-tile catalog components (hook-free fns → `<StatTileEl/>` / grid). */
export const statComponents: Record<string, CatalogComponent> = {
  StatTile: ({ props, bindingData }) => (
    <StatTileEl
      label={typeof props.label === "string" ? props.label : ""}
      nodes={boundNodes(bindingData, props)}
      valueField={typeof props.valueField === "string" ? props.valueField : undefined}
      aggregate={isAggregate(props.aggregate) ? props.aggregate : undefined}
      format={isFormat(props.format) ? props.format : "number"}
      unit={typeof props.unit === "string" ? props.unit : undefined}
      currency={typeof props.currency === "string" ? props.currency : "USD"}
      deltaField={typeof props.deltaField === "string" ? props.deltaField : undefined}
      deltaValue={typeof props.deltaValue === "number" ? props.deltaValue : undefined}
      sparklineField={
        typeof props.sparklineField === "string" ? props.sparklineField : undefined
      }
      sparkline={Array.isArray(props.sparkline) ? props.sparkline : undefined}
      loading={props.loading === true}
    />
  ),
  StatRow: ({ props, children }) => {
    // Responsive KPI grid: 2-up on small screens, up to 4-up on large.
    // `columns` (2|3|4) pins the large-screen count; static class strings
    // keep the JIT from purging them.
    const columns = typeof props.columns === "number" ? props.columns : undefined;
    const colClass =
      columns === 2
        ? "grid-cols-2"
        : columns === 3
          ? "grid-cols-1 sm:grid-cols-3"
          : "grid-cols-2 lg:grid-cols-4";
    return (
      <div data-testid="stat-row" className={cn("grid gap-3", colClass)}>
        {children}
      </div>
    );
  },
};
