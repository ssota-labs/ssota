"use client";

import { Badge } from "@ssota/ui/components/ui/badge";
import type { GoalHealthStatus } from "@ssota/contracts";
import { useLocale } from "@/components/i18n/locale-provider";

const variantByStatus: Record<
  GoalHealthStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  draft: "outline",
  approved: "default",
  active: "secondary",
  on_track: "secondary",
  at_risk: "destructive",
  achieved: "default",
  partial: "secondary",
  missed: "destructive",
  baseline_pending: "outline",
};

export function GoalsHealthBadge({ status }: { status: GoalHealthStatus }) {
  const { t } = useLocale();
  return (
    <Badge variant={variantByStatus[status]}>
      {t(`goals.health.${status}`)}
    </Badge>
  );
}
