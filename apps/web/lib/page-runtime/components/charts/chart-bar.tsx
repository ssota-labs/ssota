"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartTooltip,
  ChartTooltipContent,
} from "@ssota/ui/components/ui/chart";
import { boundNodes } from "../../bindings";
import type { CatalogComponent } from "../../types";
import { ChartShell } from "./chart-shell";
import { parseChartProps } from "./chart-types";
import { useKpiSeries } from "./use-kpi-series";

function ChartBarEl({
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
    <ChartShell title={title} height={height} isEmpty={isEmpty} testId="chart-bar">
      <BarChart data={data} accessibilityLayer margin={{ left: 8, right: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis hide domain={["auto", "auto"]} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={4} />
      </BarChart>
    </ChartShell>
  );
}

export const chartBarComponent: CatalogComponent = ({ props, bindingData }) => {
  const parsed = parseChartProps(props);
  return (
    <ChartBarEl
      nodes={boundNodes(bindingData, props)}
      height={parsed.height}
      title={parsed.title}
      snapshotProperty={parsed.snapshotProperty}
      respectPeriodFilter={parsed.respectPeriodFilter}
    />
  );
};
