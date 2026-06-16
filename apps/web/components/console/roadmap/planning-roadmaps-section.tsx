"use client";

import { useMemo, useState } from "react";
import type { RoadmapQuarter } from "@ssota/contracts";
import type { DocStatus } from "@/lib/roadmap/doc-status";
import { Accordion } from "@ssota/ui/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ssota/ui/components/ui/select";
import { useLocale } from "@/components/i18n/locale-provider";
import { PlanningRoadmapAccordionItem } from "@/components/console/roadmap/planning-roadmap-accordion-item";
import type { PlanningPeriod, RoadmapNodeView } from "@/lib/roadmap/types";

type PlanningRoadmapsSectionProps = {
  nodes: RoadmapNodeView[];
  currentYear: number;
  onCreateAnnual: (year: number) => Promise<void>;
  onCreateQuarter: (year: number, quarter: RoadmapQuarter) => Promise<void>;
  onSave: (input: {
    nodeId: string;
    title: string;
    content: string;
    docStatus?: DocStatus;
  }) => Promise<void>;
};

const QUARTERS: RoadmapQuarter[] = [1, 2, 3, 4];
const PERIODS: PlanningPeriod[] = ["annual", ...QUARTERS];

function findPlanningNode(
  nodes: RoadmapNodeView[],
  year: number,
  period: PlanningPeriod,
): RoadmapNodeView | undefined {
  if (period === "annual") {
    return nodes.find((node) => node.kind === "annual" && node.year === year);
  }
  return nodes.find(
    (node) =>
      node.kind === "quarter" &&
      node.year === year &&
      node.quarter === period,
  );
}

export function PlanningRoadmapsSection({
  nodes,
  currentYear,
  onCreateAnnual,
  onCreateQuarter,
  onSave,
}: PlanningRoadmapsSectionProps) {
  const { t } = useLocale();
  const [year, setYear] = useState(currentYear);

  const years = useMemo(() => {
    const fromNodes = nodes
      .map((node) => node.year)
      .filter((value): value is number => typeof value === "number");
    return Array.from(new Set([currentYear, ...fromNodes])).sort((a, b) => b - a);
  }, [nodes, currentYear]);

  const annualNode = nodes.find(
    (node) => node.kind === "annual" && node.year === year,
  );

  const quarterNodes = QUARTERS.map((quarter) =>
    findPlanningNode(nodes, year, quarter),
  );

  const showMissingAnnualWarning =
    quarterNodes.some(Boolean) && !annualNode && year === currentYear;

  return (
    <section
      className="rounded-lg border bg-card"
      data-testid="planning-roadmaps-section"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3 md:px-6">
        <div className="min-w-0 space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">
            {t("roadmap.planningSectionTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("roadmap.planningSectionDescription")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">{t("roadmap.year")}</span>
          <Select value={String(year)} onValueChange={(value) => setYear(Number(value))}>
            <SelectTrigger size="sm" aria-label="Year" data-testid="planning-year-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((item) => (
                <SelectItem key={item} value={String(item)}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      {showMissingAnnualWarning ? (
        <div
          className="border-b border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100 md:px-6"
          data-testid="missing-annual-warning"
        >
          {t("roadmap.missingAnnualWarning")}
        </div>
      ) : null}

      <Accordion multiple defaultValue={["annual"]} className="w-full">
        {PERIODS.map((period) => (
          <PlanningRoadmapAccordionItem
            key={period === "annual" ? "annual" : `q${period}`}
            period={period}
            year={year}
            node={findPlanningNode(nodes, year, period)}
            onCreate={() =>
              period === "annual"
                ? onCreateAnnual(year)
                : onCreateQuarter(year, period)
            }
            onSave={onSave}
          />
        ))}
      </Accordion>
    </section>
  );
}
