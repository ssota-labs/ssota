"use client";

import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";
import {
  ChartContainer,
  type ChartConfig,
} from "@ssota/ui/components/ui/chart";
import { cn } from "@ssota/ui/lib/utils";

const DEFAULT_CHART_CONFIG: ChartConfig = {
  value: {
    label: "Value",
    color: "var(--chart-1)",
  },
};

export function ChartShell({
  title,
  height,
  isEmpty,
  emptyLabel = "No data for this period",
  children,
  config = DEFAULT_CHART_CONFIG,
  testId,
}: {
  title?: string;
  height: number;
  isEmpty: boolean;
  emptyLabel?: string;
  children: ReactNode;
  config?: ChartConfig;
  testId?: string;
}) {
  return (
    <Card className="overflow-hidden" data-testid={testId}>
      {title ? (
        <CardHeader className="px-4 py-3">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className={cn("px-2 pb-2", title ? "pt-0" : "pt-3")}>
        {isEmpty ? (
          <div
            className="text-muted-foreground flex items-center justify-center rounded-md border border-dashed text-xs"
            style={{ height }}
            data-testid={testId ? `${testId}-empty` : undefined}
          >
            {emptyLabel}
          </div>
        ) : (
          <ChartContainer
            config={config}
            className="w-full"
            style={{ height }}
          >
            {children}
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
