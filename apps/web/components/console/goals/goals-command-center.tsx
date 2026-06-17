"use client";

import { useMemo, useState } from "react";
import { PageFrame } from "@ssota/ui/components/page-patterns";
import { Button } from "@ssota/ui/components/ui/button";
import type { GoalsDashboardDTO } from "@/lib/graph/goals/types";
import { useLocale } from "@/components/i18n/locale-provider";
import { GoalsFilterBar, type GoalsViewMode } from "./goals-filter-bar";
import { GoalsSummaryCards } from "./goals-summary-cards";
import { GoalsHealthHero } from "./goals-health-hero";
import { GoalsOkrTree } from "./goals-okr-tree";
import { GoalsKpiPulseTable } from "./goals-kpi-pulse-table";
import { GoalsSetupWizard } from "./goals-setup-wizard";

type GoalsCommandCenterProps = {
  dashboard: GoalsDashboardDTO;
  nodesBasePath: string;
  roadmapHref?: string;
  onCreateObjective: (input: {
    title: string;
    period?: string;
    keyResultTitle?: string;
  }) => Promise<void>;
};

export function GoalsCommandCenter({
  dashboard,
  nodesBasePath,
  roadmapHref,
  onCreateObjective,
}: GoalsCommandCenterProps) {
  const { t } = useLocale();
  const [period, setPeriod] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<GoalsViewMode>("tree");
  const [wizardOpen, setWizardOpen] = useState(false);

  const isEmpty = dashboard.summary.objectiveCount === 0;

  const filteredObjectives = useMemo(() => {
    const query = search.trim().toLowerCase();
    return dashboard.objectives.filter((objective) => {
      if (period && objective.period !== period) return false;
      if (!query) return true;
      if (objective.title.toLowerCase().includes(query)) return true;
      return objective.keyResults.some((kr) =>
        kr.title.toLowerCase().includes(query),
      );
    });
  }, [dashboard.objectives, period, search]);

  const filteredKpiPulse = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return dashboard.kpiPulse;
    return dashboard.kpiPulse.filter((row) =>
      row.title.toLowerCase().includes(query),
    );
  }, [dashboard.kpiPulse, search]);

  if (isEmpty && !wizardOpen) {
    return (
      <PageFrame>
        <GoalsSetupWizard roadmapHref={roadmapHref} onCreate={onCreateObjective} />
      </PageFrame>
    );
  }

  return (
    <PageFrame
      filters={
        <GoalsFilterBar
          periodOptions={dashboard.periodOptions}
          period={period}
          onPeriodChange={setPeriod}
          search={search}
          onSearchChange={setSearch}
          view={view}
          onViewChange={setView}
        />
      }
      actions={
        <Button type="button" size="sm" onClick={() => setWizardOpen(true)}>
          {t("goals.newObjective")}
        </Button>
      }
    >
      {wizardOpen ? (
        <GoalsSetupWizard
          startOpen
          roadmapHref={roadmapHref}
          onCancel={() => setWizardOpen(false)}
          onCreate={async (input) => {
            await onCreateObjective(input);
            setWizardOpen(false);
          }}
        />
      ) : (
        <div className="space-y-6">
          <GoalsSummaryCards summary={dashboard.summary} />
          <GoalsHealthHero summary={dashboard.summary} />
          {dashboard.roadmapContext ? (
            <p className="text-sm text-muted-foreground">
              {t("goals.roadmapContext")}: {dashboard.roadmapContext.title}
              {dashboard.roadmapContext.theme
                ? ` · ${dashboard.roadmapContext.theme}`
                : ""}
            </p>
          ) : null}
          {view === "tree" ? (
            <>
              <GoalsOkrTree
                objectives={filteredObjectives}
                unlinkedKeyResults={dashboard.unlinkedKeyResults}
                nodesBasePath={nodesBasePath}
              />
              <GoalsKpiPulseTable rows={filteredKpiPulse} />
            </>
          ) : (
            <GoalsKpiPulseTable rows={filteredKpiPulse} />
          )}
        </div>
      )}
    </PageFrame>
  );
}
