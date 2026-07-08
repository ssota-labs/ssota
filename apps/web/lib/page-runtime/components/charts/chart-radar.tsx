"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
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

function ChartRadarEl({
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
    <ChartShell title={title} height={height} isEmpty={isEmpty} testId="chart-radar">
      <RadarChart data={data} accessibilityLayer>
        <PolarGrid />
        <PolarAngleAxis dataKey="label" />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Radar
          dataKey="value"
          stroke="var(--color-value)"
          fill="var(--color-value)"
          fillOpacity={0.35}
        />
      </RadarChart>
    </ChartShell>
  );
}

export const chartRadarComponent: CatalogComponent = ({ props, bindingData }) => {
  const parsed = parseChartProps(props);
  return (
    <ChartRadarEl
      nodes={boundNodes(bindingData, props)}
      height={parsed.height}
      title={parsed.title}
      snapshotProperty={parsed.snapshotProperty}
      respectPeriodFilter={parsed.respectPeriodFilter}
      agg={parsed.agg}
    />
  );
};
