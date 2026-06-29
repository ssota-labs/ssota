export type ChartBindingProps = {
  binding?: unknown;
  height?: unknown;
  title?: unknown;
  snapshotProperty?: unknown;
  respectPeriodFilter?: unknown;
};

export type ChartRuntimeProps = {
  binding: string;
  height: number;
  title?: string;
  snapshotProperty: string;
  respectPeriodFilter: boolean;
};

export function parseChartProps(props: Record<string, unknown>): ChartRuntimeProps {
  return {
    binding: typeof props.binding === "string" ? props.binding : "rows",
    height: typeof props.height === "number" ? props.height : 128,
    title: typeof props.title === "string" ? props.title : undefined,
    snapshotProperty:
      typeof props.snapshotProperty === "string" ? props.snapshotProperty : "snapshots",
    respectPeriodFilter: props.respectPeriodFilter !== false,
  };
}

export type KpiSeriesPoint = {
  label: string;
  value: number;
  capturedAt: string;
};
