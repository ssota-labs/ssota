"use client";

import Link from "next/link";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@ssota/ui/components/ui/card";
import { Progress } from "@ssota/ui/components/ui/progress";
import type { GoalObjectiveRow } from "@/lib/graph/goals/types";
import { useLocale } from "@/components/i18n/locale-provider";
import { GoalsHealthBadge } from "./goals-health-badge";
import { KeyResultRow } from "./key-result-row";

type ObjectiveCardProps = {
  objective: GoalObjectiveRow;
  nodesBasePath: string;
};

export function ObjectiveCard({ objective, nodesBasePath }: ObjectiveCardProps) {
  const { t } = useLocale();

  return (
    <Card>
      <CardHeader className="space-y-3 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base">
              <Link href={`${nodesBasePath}/${objective.id}`} className="hover:underline">
                {objective.title}
              </Link>
            </CardTitle>
            {objective.roadmapTheme ? (
              <p className="text-xs text-muted-foreground">
                {t("goals.fromRoadmap")}: {objective.roadmapTheme}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {objective.period ? (
              <Badge variant="outline">{objective.period}</Badge>
            ) : null}
            {objective.priority ? (
              <Badge variant="secondary">{objective.priority}</Badge>
            ) : null}
            <GoalsHealthBadge status={objective.status} />
          </div>
        </div>
        {objective.progress !== null ? (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
              <span>{t("goals.overallProgress")}</span>
              <span>{objective.progress}%</span>
            </div>
            <Progress value={objective.progress} className="h-2" />
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {objective.keyResults.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("goals.keyResults")}
            </p>
            {objective.keyResults.map((kr) => (
              <KeyResultRow key={kr.id} row={kr} nodesBasePath={nodesBasePath} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("goals.noKeyResults")}</p>
        )}
        {objective.trackedKpis.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {objective.trackedKpis.map((kpi) => (
              <Badge key={kpi.id} variant="outline" className="tabular-nums">
                {kpi.title}: {kpi.current ?? "—"}
                {kpi.unit ? kpi.unit : ""}
              </Badge>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
