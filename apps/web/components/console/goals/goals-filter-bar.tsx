"use client";

import { Button } from "@ssota/ui/components/ui/button";
import { Input } from "@ssota/ui/components/ui/input";
import { useLocale } from "@/components/i18n/locale-provider";

export type GoalsViewMode = "tree" | "kpi";

type GoalsFilterBarProps = {
  periodOptions: string[];
  period: string | null;
  onPeriodChange: (period: string | null) => void;
  search: string;
  onSearchChange: (value: string) => void;
  view: GoalsViewMode;
  onViewChange: (view: GoalsViewMode) => void;
};

export function GoalsFilterBar({
  periodOptions,
  period,
  onPeriodChange,
  search,
  onSearchChange,
  view,
  onViewChange,
}: GoalsFilterBarProps) {
  const { t } = useLocale();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1">
        <Button
          type="button"
          size="sm"
          variant={period === null ? "secondary" : "ghost"}
          onClick={() => onPeriodChange(null)}
        >
          {t("goals.filters.allPeriods")}
        </Button>
        {periodOptions.map((option) => (
          <Button
            key={option}
            type="button"
            size="sm"
            variant={period === option ? "secondary" : "ghost"}
            onClick={() => onPeriodChange(option)}
          >
            {option}
          </Button>
        ))}
      </div>
      <Input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={t("goals.filters.search")}
        className="h-8 w-full max-w-xs"
      />
      <div className="flex gap-1">
        <Button
          type="button"
          size="sm"
          variant={view === "tree" ? "secondary" : "ghost"}
          onClick={() => onViewChange("tree")}
        >
          {t("goals.views.tree")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={view === "kpi" ? "secondary" : "ghost"}
          onClick={() => onViewChange("kpi")}
        >
          {t("goals.views.kpi")}
        </Button>
      </div>
    </div>
  );
}
