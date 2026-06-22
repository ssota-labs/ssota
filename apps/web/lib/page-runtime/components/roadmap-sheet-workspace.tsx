"use client";

import { useEffect, useMemo, useState } from "react";
import type { RoadmapQuarter } from "@ssota/contracts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ssota/ui/components/ui/select";
import { useLocale } from "@/components/i18n/locale-provider";
import { useAction } from "../context";
import type { RenderNode } from "../types";
import {
  DocumentSheetPanel,
  type SheetSize,
} from "./document-sheet-panel";
import {
  readNodeField,
  readRoadmapKind,
  readRoadmapQuarter,
  readRoadmapYear,
  RoadmapDocCard,
} from "./roadmap-doc-card";

type PlanningPeriod = "annual" | RoadmapQuarter;
const QUARTERS: RoadmapQuarter[] = [1, 2, 3, 4];
const PERIODS: PlanningPeriod[] = ["annual", ...QUARTERS];

export type RoadmapSheetWorkspaceProps = {
  productNode?: RenderNode;
  planningNodes: RenderNode[];
  field?: string;
  subtitleField?: string;
  statusField?: string;
  editable?: boolean;
  action?: string;
  createAnnualAction?: string;
  createQuarterAction?: string;
  sheetSize?: SheetSize;
};

function findPlanningNode(
  nodes: RenderNode[],
  year: number,
  period: PlanningPeriod,
): RenderNode | undefined {
  if (period === "annual") {
    return nodes.find(
      (node) => readRoadmapKind(node) === "annual" && readRoadmapYear(node) === year,
    );
  }
  return nodes.find(
    (node) =>
      readRoadmapKind(node) === "quarter" &&
      readRoadmapYear(node) === year &&
      readRoadmapQuarter(node) === period,
  );
}

function periodTitle(year: number, period: PlanningPeriod): string {
  if (period === "annual") return `${year} 연간 로드맵`;
  return `${year} Q${period} 분기 로드맵`;
}

function periodTestId(period: PlanningPeriod): string {
  return period === "annual" ? "annual" : `q${period}`;
}

export function RoadmapSheetWorkspaceEl({
  productNode,
  planningNodes,
  field = "content",
  subtitleField = "summary",
  statusField = "lifecycleStatus",
  editable = false,
  action,
  createAnnualAction,
  createQuarterAction,
  sheetSize = "half",
}: RoadmapSheetWorkspaceProps) {
  const { t } = useLocale();
  const onAction = useAction();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [activeId, setActiveId] = useState<string | null>(null);

  const years = useMemo(() => {
    const fromNodes = planningNodes
      .map((node) => readRoadmapYear(node))
      .filter((value): value is number => typeof value === "number");
    return Array.from(new Set([currentYear, ...fromNodes])).sort((a, b) => b - a);
  }, [planningNodes, currentYear]);

  const activeNode =
    [productNode, ...planningNodes].find((node) => node?.id === activeId) ?? null;
  const open = activeNode !== null;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const annualNode = findPlanningNode(planningNodes, year, "annual");
  const showMissingAnnualWarning =
    year === currentYear &&
    !annualNode &&
    QUARTERS.some((quarter) => findPlanningNode(planningNodes, year, quarter));

  const openNode = (nodeId: string) => setActiveId(nodeId);
  const close = () => setActiveId(null);

  const handleCreateAnnual = () => {
    if (!onAction || !createAnnualAction) return;
    void onAction(createAnnualAction, {
      title: periodTitle(year, "annual"),
      year,
      kind: "annual",
    });
  };

  const handleCreateQuarter = (quarter: RoadmapQuarter) => {
    if (!onAction || !createQuarterAction) return;
    void onAction(createQuarterAction, {
      title: periodTitle(year, quarter),
      year,
      quarter,
      kind: "quarter",
    });
  };

  return (
    <div
      className="absolute inset-0 overflow-y-auto p-4 md:p-6"
      data-testid="roadmap-sheet-workspace"
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <section
          className="border-border bg-card space-y-4 rounded-xl border p-4 md:p-5"
          data-testid="product-roadmap-section"
        >
          <header className="space-y-1 border-b pb-4">
            <h2 className="text-lg font-semibold tracking-tight">
              {t("roadmap.productRoadmap")}
            </h2>
            <p className="text-muted-foreground text-sm">
              {t("roadmap.productRoadmapDescription")}
            </p>
          </header>

          <div className="grid gap-3" data-testid="product-roadmap-card-group">
            {productNode ? (
              <RoadmapDocCard
                testId="product-roadmap-card"
                title={productNode.title || t("roadmap.productRoadmap")}
                subtitle={readNodeField(productNode, subtitleField)}
                status={readNodeField(productNode, statusField)}
                onOpen={() => openNode(productNode.id)}
              />
            ) : (
              <RoadmapDocCard
                testId="product-roadmap-card"
                title={t("roadmap.productRoadmap")}
                empty
                emptyLabel={t("roadmap.emptyProductDescription")}
              />
            )}
          </div>
        </section>

        <section
          className="border-border bg-card space-y-4 rounded-xl border p-4 md:p-5"
          data-testid="planning-roadmaps-section"
        >
          <header className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
            <div className="min-w-0 space-y-1">
              <h2 className="text-lg font-semibold tracking-tight">
                {t("roadmap.planningSectionTitle")}
              </h2>
              <p className="text-muted-foreground text-sm">
                {t("roadmap.planningSectionDescription")}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">{t("roadmap.year")}</span>
              <Select value={String(year)} onValueChange={(value) => setYear(Number(value))}>
                <SelectTrigger
                  size="sm"
                  aria-label="Year"
                  data-testid="planning-year-select"
                >
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
              className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100"
              data-testid="missing-annual-warning"
            >
              {t("roadmap.missingAnnualWarning")}
            </div>
          ) : null}

          <div
            className="grid gap-3 sm:grid-cols-2"
            data-testid="planning-roadmap-card-group"
          >
            {PERIODS.map((period) => {
              const node = findPlanningNode(planningNodes, year, period);
              const cardTestId = `planning-roadmap-card-${periodTestId(period)}`;
              const eyebrow = `${t("roadmap.planningParent")} › ${
                period === "annual" ? `${year} 연간` : `Q${period}`
              }`;

              if (node) {
                return (
                  <RoadmapDocCard
                    key={period}
                    testId={cardTestId}
                    eyebrow={eyebrow}
                    title={node.title}
                    subtitle={readNodeField(node, subtitleField)}
                    status={readNodeField(node, statusField)}
                    onOpen={() => openNode(node.id)}
                  />
                );
              }

              return (
                <RoadmapDocCard
                  key={period}
                  testId={cardTestId}
                  eyebrow={eyebrow}
                  title={periodTitle(year, period)}
                  empty
                  emptyLabel={t("roadmap.emptyPlanningNotCreated")}
                  createLabel={
                    period === "annual"
                      ? t("roadmap.createAnnual")
                      : t("roadmap.createQuarter").replace("{quarter}", String(period))
                  }
                  onCreate={() =>
                    period === "annual"
                      ? handleCreateAnnual()
                      : handleCreateQuarter(period)
                  }
                />
              );
            })}
          </div>
        </section>
      </div>

      {open && activeNode ? (
        <DocumentSheetPanel
          node={activeNode}
          subtitle={readNodeField(activeNode, subtitleField)}
          status={readNodeField(activeNode, statusField)}
          field={field}
          editable={editable}
          sheetSize={sheetSize}
          onClose={close}
          onSave={(blocks) => {
            if (onAction && action) {
              void onAction(action, {
                nodeId: activeNode.id,
                doc: blocks,
              });
            }
          }}
        />
      ) : null}
    </div>
  );
}
