"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@ssota/ui/components/ui/card";
import { Progress } from "@ssota/ui/components/ui/progress";
import type { GoalsSummary } from "@/lib/graph/goals/types";
import { useLocale } from "@/components/i18n/locale-provider";

export function GoalsHealthHero({ summary }: { summary: GoalsSummary }) {
  const { t } = useLocale();
  const onTrack =
    summary.keyResultCount > 0
      ? summary.keyResultCount - summary.atRiskCount
      : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("goals.hero.okrHealth")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums">
            {summary.achievedCount}/{summary.objectiveCount}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("goals.hero.objectivesAchieved")}
            {summary.atRiskCount > 0
              ? ` · ${summary.atRiskCount} ${t("goals.stats.atRisk").toLowerCase()}`
              : ""}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("goals.hero.periodProgress")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-2xl font-semibold tabular-nums">
            {summary.periodProgress !== null ? `${summary.periodProgress}%` : "—"}
          </p>
          {summary.periodProgress !== null ? (
            <Progress value={summary.periodProgress} className="h-2" />
          ) : null}
          <p className="text-sm text-muted-foreground">
            {onTrack} {t("goals.hero.keyResultsOnTrack")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
