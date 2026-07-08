"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartTooltip,
  ChartTooltipContent,
} from "@ssota/ui/components/ui/chart";
import { boundNodes } from "../../bindings";
import type { CatalogComponent } from "../../types";
import { ChartShell } from "./chart-shell";
import { parseChartProps, type ChartAgg } from "./chart-types";
import { useKpiSeries } from "./use-kpi-series";

function ChartLineEl({
  nodes,
  height,
  title,
  snapshotProperty,
  respectPeriodFilter,
  agg,
}: {
  nodes: ReturnType<typeof boundNodes>;
  height: number;
  title?: string;
  snapshotProperty: string;
  respectPeriodFilter: boolean;
  agg: ChartAgg;
}) {
  const { data, isEmpty } = useKpiSeries(nodes, {
    snapshotProperty,
    respectPeriodFilter,
    agg,
  });

  return (
    <ChartShell
      title={title}
      height={height}
      isEmpty={isEmpty}
      testId="chart-line"
    >
      <LineChart data={data} accessibilityLayer margin={{ left: 8, right: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
        />
        <YAxis hide domain={["auto", "auto"]} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          type="monotone"
          dataKey="value"
          stroke="var(--color-value)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartShell>
  );
}

export const chartLineComponent: CatalogComponent = ({ props, bindingData }) => {
  const parsed = parseChartProps(props);
  return (
    <ChartLineEl
      nodes={boundNodes(bindingData, props)}
      height={parsed.height}
      title={parsed.title}
      snapshotProperty={parsed.snapshotProperty}
      respectPeriodFilter={parsed.respectPeriodFilter}
      agg={parsed.agg}
    />
  );
};
