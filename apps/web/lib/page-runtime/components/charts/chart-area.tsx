"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartTooltip,
  ChartTooltipContent,
} from "@ssota/ui/components/ui/chart";
import { boundNodes } from "../../bindings";
import type { CatalogComponent } from "../../types";
import { ChartShell } from "./chart-shell";
import { parseChartProps } from "./chart-types";
import { useKpiSeries } from "./use-kpi-series";

function ChartAreaEl({
  nodes,
  height,
  title,
  snapshotProperty,
  respectPeriodFilter,
}: {
  nodes: ReturnType<typeof boundNodes>;
  height: number;
  title?: string;
  snapshotProperty: string;
  respectPeriodFilter: boolean;
}) {
  const { data, isEmpty } = useKpiSeries(nodes, {
    snapshotProperty,
    respectPeriodFilter,
  });

  return (
    <ChartShell title={title} height={height} isEmpty={isEmpty} testId="chart-area">
      <AreaChart data={data} accessibilityLayer margin={{ left: 8, right: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis hide domain={["auto", "auto"]} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke="var(--color-value)"
          fill="var(--color-value)"
          fillOpacity={0.2}
        />
      </AreaChart>
    </ChartShell>
  );
}

export const chartAreaComponent: CatalogComponent = ({ props, bindingData }) => {
  const parsed = parseChartProps(props);
  return (
    <ChartAreaEl
      nodes={boundNodes(bindingData, props)}
      height={parsed.height}
      title={parsed.title}
      snapshotProperty={parsed.snapshotProperty}
      respectPeriodFilter={parsed.respectPeriodFilter}
    />
  );
};
