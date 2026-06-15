"use client";

import { Badge } from "@ssota/ui/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";
import type { HubStatCard } from "@ssota/ui/components/page-patterns/page-pattern-hub";
import type { GoalsSummary } from "@/lib/graph/goals/types";
import { useLocale } from "@/components/i18n/locale-provider";

export function GoalsSummaryCards({ summary }: { summary: GoalsSummary }) {
  const { t } = useLocale();

  const stats: HubStatCard[] = [
    {
      id: "objectives",
      label: t("goals.stats.objectives"),
      value: summary.objectiveCount,
    },
    {
      id: "keyResults",
      label: t("goals.stats.keyResults"),
      value: summary.keyResultCount,
    },
    {
      id: "kpis",
      label: t("goals.stats.kpis"),
      value: summary.kpiCount,
    },
    {
      id: "atRisk",
      label: t("goals.stats.atRisk"),
      value: summary.atRiskCount,
      badge: summary.atRiskCount > 0 ? t("goals.stats.needsAttention") : undefined,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardDescription>{stat.label}</CardDescription>
              {stat.badge ? <Badge variant="secondary">{stat.badge}</Badge> : null}
            </div>
            <CardTitle className="text-2xl tabular-nums">{stat.value}</CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
