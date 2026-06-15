"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RoadmapQuarter } from "@ssota/contracts";
import type { DocStatus } from "@/lib/roadmap/doc-status";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ssota/ui/components/ui/select";
import { useLocale } from "@/components/i18n/locale-provider";
import { RoadmapDocumentSheet } from "@/components/console/roadmap/roadmap-document-sheet";
import { RoadmapMarkdownPreview } from "@/components/console/roadmap/roadmap-markdown-preview";
import {
  DOC_STATUS_LABELS,
  DOC_STATUS_OPTIONS,
} from "@/lib/roadmap/doc-status";
import type { PlanningPeriod, RoadmapNodeView } from "@/lib/roadmap/types";

type PlanningRoadmapsSectionProps = {
  productRoadmapTitle: string;
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

function planningLabel(node: RoadmapNodeView) {
  if (node.kind === "annual") return `${node.year} 연간 로드맵`;
  if (node.kind === "quarter" && node.year && node.quarter) {
    return `${node.year} Q${node.quarter} 분기 로드맵`;
  }
  return node.title || "로드맵";
}

function targetTitle(year: number, period: PlanningPeriod) {
  if (period === "annual") return `${year} 연간 로드맵`;
  return `${year} Q${period} 분기 로드맵`;
}

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
  productRoadmapTitle,
  nodes,
  currentYear,
  onCreateAnnual,
  onCreateQuarter,
  onSave,
}: PlanningRoadmapsSectionProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [year, setYear] = useState(currentYear);
  const [period, setPeriod] = useState<PlanningPeriod>("annual");
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();

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

  const activeNode = findPlanningNode(nodes, year, period);

  const showMissingAnnualWarning =
    quarterNodes.some(Boolean) && !annualNode && year === currentYear;

  const breadcrumbSuffix =
    period === "annual" ? ` › ${year} 연간` : ` › Q${period}`;

  const handleCreate = () => {
    if (activeNode || pending) return;

    startTransition(async () => {
      try {
        if (period === "annual") {
          await onCreateAnnual(year);
        } else {
          await onCreateQuarter(year, period);
        }
      } finally {
        router.refresh();
      }
    });
  };

  const handleDocStatusChange = (value: DocStatus | null) => {
    if (!activeNode || !value) return;
    startTransition(async () => {
      await onSave({
        nodeId: activeNode.id,
        title: activeNode.title,
        content: activeNode.content,
        docStatus: value,
      });
      router.refresh();
    });
  };

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

          <span className="text-sm text-muted-foreground">{t("roadmap.planningPeriod")}</span>
          <Select
            value={period === "annual" ? "annual" : String(period)}
            onValueChange={(value) =>
              setPeriod(value === "annual" ? "annual" : (Number(value) as RoadmapQuarter))
            }
          >
            <SelectTrigger size="sm" aria-label="Planning period" data-testid="planning-period-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="annual">{t("roadmap.annualRoadmap")}</SelectItem>
              {QUARTERS.map((quarter) => (
                <SelectItem key={quarter} value={String(quarter)}>
                  Q{quarter}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="space-y-4 p-4 md:p-6">
        {showMissingAnnualWarning ? (
          <div
            className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100"
            data-testid="missing-annual-warning"
          >
            {t("roadmap.missingAnnualWarning")}
          </div>
        ) : null}

        <article
          className="rounded-md border bg-muted/20"
          data-testid="planning-roadmap-detail"
        >
          <header className="space-y-2 border-b px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {productRoadmapTitle}
              {breadcrumbSuffix}
            </p>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-semibold">
                {activeNode ? planningLabel(activeNode) : targetTitle(year, period)}
              </h3>
              {activeNode ? (
                <Select
                  value={activeNode.docStatus ?? "draft"}
                  onValueChange={handleDocStatusChange}
                  disabled={pending}
                >
                  <SelectTrigger size="sm" aria-label="Document status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {DOC_STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
            </div>
          </header>

          <div className="space-y-4 p-4 md:p-6">
            {!activeNode ? (
              <div
                className="rounded-md border border-dashed bg-muted/10 p-6 text-center"
                data-testid="planning-roadmap-empty"
              >
                <p className="text-sm text-muted-foreground">
                  {t("roadmap.emptyPlanningNotCreated")}
                </p>
                <Button
                  type="button"
                  size="sm"
                  className="mt-4"
                  disabled={pending}
                  data-testid="planning-roadmap-create"
                  onClick={handleCreate}
                >
                  {period === "annual"
                    ? t("roadmap.createAnnual")
                    : t("roadmap.createQuarter", { quarter: period })}
                </Button>
              </div>
            ) : activeNode.content.trim() ? (
              <RoadmapMarkdownPreview content={activeNode.content} />
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("roadmap.emptyPlanningDescription")}
              </p>
            )}

            {activeNode ? (
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!activeNode.content.trim()}
                  onClick={() => setViewOpen(true)}
                >
                  {t("roadmap.viewFull")}
                </Button>
                <Button type="button" size="sm" onClick={() => setEditOpen(true)}>
                  {t("roadmap.edit")}
                </Button>
              </div>
            ) : null}
          </div>

          {activeNode ? (
            <>
              <RoadmapDocumentSheet
                open={viewOpen}
                mode="view"
                title={activeNode.title}
                content={activeNode.content}
                description={planningLabel(activeNode)}
                saveLabel={t("common.save")}
                onOpenChange={setViewOpen}
              />
              <RoadmapDocumentSheet
                open={editOpen}
                mode="edit"
                title={activeNode.title}
                content={activeNode.content}
                description={planningLabel(activeNode)}
                saveLabel={t("common.save")}
                onOpenChange={setEditOpen}
                onSave={async (input) => {
                  await onSave({
                    nodeId: activeNode.id,
                    ...input,
                    docStatus: activeNode.docStatus,
                  });
                }}
              />
            </>
          ) : null}
        </article>
      </div>
    </section>
  );
}
