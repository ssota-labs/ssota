export type ChartBindingProps = {
  binding?: unknown;
  height?: unknown;
  title?: unknown;
  snapshotProperty?: unknown;
  respectPeriodFilter?: unknown;
};

/**
 * Aggregation mode: group a multi-node binding by `groupBy` and reduce
 * `valueField` with `aggregate` into one series point per group. When `groupBy`
 * is absent the chart falls back to the KPI-snapshot series.
 */
export type ChartAgg = {
  groupBy?: string;
  valueField?: string;
  aggregate?: "count" | "sum" | "avg";
};

export type ChartRuntimeProps = {
  binding: string;
  height: number;
  title?: string;
  snapshotProperty: string;
  respectPeriodFilter: boolean;
  agg: ChartAgg;
};

export function parseChartProps(props: Record<string, unknown>): ChartRuntimeProps {
  return {
    binding: typeof props.binding === "string" ? props.binding : "rows",
    height: typeof props.height === "number" ? props.height : 128,
    title: typeof props.title === "string" ? props.title : undefined,
    snapshotProperty:
      typeof props.snapshotProperty === "string" ? props.snapshotProperty : "snapshots",
    respectPeriodFilter: props.respectPeriodFilter !== false,
    agg: {
      groupBy: typeof props.groupBy === "string" ? props.groupBy : undefined,
      valueField: typeof props.valueField === "string" ? props.valueField : undefined,
      aggregate:
        props.aggregate === "sum" || props.aggregate === "avg" || props.aggregate === "count"
          ? props.aggregate
          : undefined,
    },
  };
}

export type KpiSeriesPoint = {
  label: string;
  value: number;
  capturedAt: string;
};
