"use client";

import { useMemo } from "react";
import { isCapturedAtInPeriod } from "../../period-preset";
import { usePeriodFilter } from "../../period-filter-context";
import type { RenderNode } from "../../types";
import { aggregateSeries } from "./chart-aggregate";
import type { ChartAgg, KpiSeriesPoint } from "./chart-types";

function readSnapshots(
  node: RenderNode | undefined,
  snapshotProperty: string,
): Array<{ value: number; captured_at?: string }> {
  if (!node) return [];
  const raw = (node.properties as Record<string, unknown>)?.[snapshotProperty];
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const props =
      row.properties && typeof row.properties === "object"
        ? (row.properties as Record<string, unknown>)
        : row;
    const value = props.value;
    if (typeof value !== "number" || Number.isNaN(value)) return [];
    return [
      {
        value,
        captured_at:
          typeof props.captured_at === "string" ? props.captured_at : undefined,
      },
    ];
  });
}

function formatAxisLabel(capturedAt: string): string {
  const date = new Date(capturedAt);
  if (Number.isNaN(date.getTime())) return capturedAt;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function useKpiSeries(
  nodes: RenderNode[],
  options: {
    snapshotProperty: string;
    respectPeriodFilter: boolean;
    agg?: ChartAgg;
  },
): {
  kpi: RenderNode | undefined;
  data: KpiSeriesPoint[];
  isEmpty: boolean;
} {
  const { range } = usePeriodFilter();
  const kpi = nodes[0];
  const filterRange = options.respectPeriodFilter ? range : null;
  const groupBy = options.agg?.groupBy;
  const valueField = options.agg?.valueField;
  const aggKind = options.agg?.aggregate;

  const snapshotData = useMemo(() => {
    const snapshots = readSnapshots(kpi, options.snapshotProperty)
      .filter((snapshot) =>
        isCapturedAtInPeriod(snapshot.captured_at, filterRange),
      )
      .sort((a, b) => {
        const aTime = a.captured_at ? new Date(a.captured_at).getTime() : 0;
        const bTime = b.captured_at ? new Date(b.captured_at).getTime() : 0;
        return aTime - bTime;
      });

    return snapshots.map((snapshot, index) => ({
      label: snapshot.captured_at
        ? formatAxisLabel(snapshot.captured_at)
        : `Point ${index + 1}`,
      value: snapshot.value,
      capturedAt: snapshot.captured_at ?? "",
    }));
  }, [filterRange, kpi, options.snapshotProperty]);

  // Aggregation mode (groupBy) reduces the whole binding; otherwise fall back to
  // the single-node KPI snapshot series. Both memos run to keep hook order stable.
  const aggregatedData = useMemo(
    () => (groupBy ? aggregateSeries(nodes, { groupBy, valueField, aggregate: aggKind }) : null),
    [nodes, groupBy, valueField, aggKind],
  );

  const data = aggregatedData ?? snapshotData;
  return {
    kpi: aggregatedData ? undefined : kpi,
    data,
    isEmpty: data.length === 0,
  };
}
