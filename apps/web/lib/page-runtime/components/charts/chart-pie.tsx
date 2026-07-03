"use client";

import { Cell, Pie, PieChart } from "recharts";
import {
  ChartTooltip,
  ChartTooltipContent,
} from "@ssota/ui/components/ui/chart";
import { boundNodes } from "../../bindings";
import type { CatalogComponent } from "../../types";
import { ChartShell } from "./chart-shell";
import { parseChartProps } from "./chart-types";
import { useKpiSeries } from "./use-kpi-series";

const PIE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function ChartPieEl({
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
    <ChartShell title={title} height={height} isEmpty={isEmpty} testId="chart-pie">
      <PieChart accessibilityLayer>
        <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
        <Pie data={data} dataKey="value" nameKey="label" innerRadius={height * 0.2}>
          {data.map((entry, index) => (
            <Cell
              key={entry.capturedAt || entry.label}
              fill={PIE_COLORS[index % PIE_COLORS.length]}
            />
          ))}
        </Pie>
      </PieChart>
    </ChartShell>
  );
}

export const chartPieComponent: CatalogComponent = ({ props, bindingData }) => {
  const parsed = parseChartProps(props);
  return (
    <ChartPieEl
      nodes={boundNodes(bindingData, props)}
      height={parsed.height}
      title={parsed.title}
      snapshotProperty={parsed.snapshotProperty}
      respectPeriodFilter={parsed.respectPeriodFilter}
    />
  );
};
