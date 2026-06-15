"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RoadmapQuarter } from "@ssota/contracts";
import type { DocStatus } from "@/lib/roadmap/doc-status";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ssota/ui/components/ui/select";
import { cn } from "@ssota/ui/lib/utils";
import { useLocale } from "@/components/i18n/locale-provider";
import { RoadmapDocumentSheet } from "@/components/console/roadmap/roadmap-document-sheet";
import { RoadmapMarkdownPreview } from "@/components/console/roadmap/roadmap-markdown-preview";
import {
  DOC_STATUS_LABELS,
  DOC_STATUS_OPTIONS,
} from "@/lib/roadmap/doc-status";
import type { PlanningKindFilter, RoadmapNodeView } from "@/lib/roadmap/types";

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
  const [kindFilter, setKindFilter] = useState<PlanningKindFilter>("all");
  const [year, setYear] = useState(currentYear);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const years = useMemo(() => {
    const fromNodes = nodes
      .map((node) => node.year)
      .filter((value): value is number => typeof value === "number");
    return Array.from(new Set([currentYear, ...fromNodes])).sort((a, b) => b - a);
  }, [nodes, currentYear]);

  const filteredNodes = useMemo(() => {
    return nodes.filter((node) => {
      if (node.year !== year) return false;
      if (kindFilter === "all") return true;
      return node.kind === kindFilter;
    });
  }, [nodes, year, kindFilter]);

  const annualNode = nodes.find(
    (node) => node.kind === "annual" && node.year === year,
  );

  const quarterNodes = QUARTERS.map((quarter) =>
    nodes.find(
      (node) =>
        node.kind === "quarter" && node.year === year && node.quarter === quarter,
    ),
  );

  const selectedNode =
    filteredNodes.find((node) => node.id === selectedId) ??
    annualNode ??
    quarterNodes.find(Boolean) ??
    null;

  const showMissingAnnualWarning =
    quarterNodes.some(Boolean) && !annualNode && year === currentYear;

  const handleCreateAnnual = () => {
    if (annualNode) {
      setSelectedId(annualNode.id);
      return;
    }
    if (pending) return;

    startTransition(async () => {
      try {
        await onCreateAnnual(year);
      } finally {
        router.refresh();
      }
    });
  };

  const handleCreateQuarter = (quarter: RoadmapQuarter) => {
    const existing = quarterNodes[QUARTERS.indexOf(quarter)];
    if (existing) {
      setSelectedId(existing.id);
      return;
    }
    if (pending) return;

    startTransition(async () => {
      try {
        await onCreateQuarter(year, quarter);
      } finally {
        router.refresh();
      }
    });
  };

  const handleDocStatusChange = (value: DocStatus | null) => {
    if (!selectedNode || !value) return;
    startTransition(async () => {
      await onSave({
        nodeId: selectedNode.id,
        title: selectedNode.title,
        content: selectedNode.content,
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
      <header className="border-b px-4 py-3 md:px-6">
        <h2 className="text-lg font-semibold tracking-tight">
          {t("roadmap.planningSectionTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("roadmap.planningSectionDescription")}
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 md:px-6">
        <div className="flex flex-wrap items-center gap-2">
          {(["all", "annual", "quarter"] as const).map((kind) => (
            <Button
              key={kind}
              type="button"
              size="sm"
              variant={kindFilter === kind ? "secondary" : "ghost"}
              onClick={() => setKindFilter(kind)}
            >
              {kind === "all"
                ? t("roadmap.kindAll")
                : kind === "annual"
                  ? t("roadmap.annualRoadmap")
                  : t("roadmap.quarterRoadmap")}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">{t("roadmap.year")}</span>
          <Select value={String(year)} onValueChange={(value) => setYear(Number(value))}>
            <SelectTrigger size="sm" aria-label="Year">
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
      </div>

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
          className="rounded-md border bg-muted/20 px-3 py-2"
          data-testid="planning-year-card"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="shrink-0 text-xs font-medium text-muted-foreground">
              {year}
            </span>

            <div
              className={cn(
                "inline-flex min-h-8 max-w-full items-center gap-2 rounded-md border px-2.5 py-1 text-left text-sm transition-colors",
                annualNode && "cursor-pointer bg-card hover:bg-muted/40",
                annualNode && selectedNode?.id === annualNode.id && "ring-2 ring-primary",
                !annualNode && "border-dashed bg-muted/10",
              )}
              data-testid="annual-roadmap-card"
              role={annualNode ? "button" : undefined}
              tabIndex={annualNode ? 0 : undefined}
              onClick={() => annualNode && setSelectedId(annualNode.id)}
              onKeyDown={(event) => {
                if (!annualNode) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedId(annualNode.id);
                }
              }}
            >
              {annualNode ? (
                <>
                  <span className="truncate font-medium">{planningLabel(annualNode)}</span>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    {DOC_STATUS_LABELS[annualNode.docStatus ?? "draft"]}
                  </Badge>
                </>
              ) : (
                <>
                  <span className="text-muted-foreground">{t("roadmap.annualRoadmap")}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-xs"
                    disabled={pending}
                    onClick={handleCreateAnnual}
                  >
                    {t("roadmap.newAnnual")}
                  </Button>
                </>
              )}
            </div>

            <div
              className="flex flex-wrap items-center gap-1.5"
              data-testid="quarter-roadmap-chips"
            >
              {QUARTERS.map((quarter, index) => {
                const node = quarterNodes[index];
                return (
                  <button
                    key={quarter}
                    type="button"
                    data-testid={`quarter-chip-q${quarter}`}
                    title={
                      node
                        ? DOC_STATUS_LABELS[node.docStatus ?? "draft"]
                        : t("roadmap.createQuarterChip")
                    }
                    className={cn(
                      "inline-flex h-8 min-w-[2.75rem] items-center justify-center gap-1 rounded-md border px-2 text-xs transition-colors hover:bg-muted/40",
                      node ? "bg-card" : "border-dashed bg-muted/10",
                      node && selectedNode?.id === node.id && "ring-2 ring-primary",
                    )}
                    onClick={() => {
                      if (node) {
                        setSelectedId(node.id);
                        return;
                      }
                      handleCreateQuarter(quarter);
                    }}
                  >
                    <span className="font-medium">Q{quarter}</span>
                    {!node ? (
                      <span className="text-[10px] text-muted-foreground">+</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </article>

        {selectedNode ? (
          <article
            className="rounded-md border bg-muted/20"
            data-testid="planning-roadmap-detail"
          >
            <header className="space-y-2 border-b px-4 py-3">
              <p className="text-xs text-muted-foreground">
                {productRoadmapTitle}
                {annualNode ? ` › ${annualNode.year} 연간` : ""}
                {selectedNode.kind === "quarter" && selectedNode.quarter
                  ? ` › Q${selectedNode.quarter}`
                  : ""}
              </p>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-semibold">{planningLabel(selectedNode)}</h3>
                <Select
                  value={selectedNode.docStatus ?? "draft"}
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
              </div>
            </header>

            <div className="space-y-4 p-4 md:p-6">
              {selectedNode.content.trim() ? (
                <RoadmapMarkdownPreview content={selectedNode.content} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("roadmap.emptyPlanningDescription")}
                </p>
              )}

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!selectedNode.content.trim()}
                  onClick={() => setViewOpen(true)}
                >
                  {t("roadmap.viewFull")}
                </Button>
                <Button type="button" size="sm" onClick={() => setEditOpen(true)}>
                  {t("roadmap.edit")}
                </Button>
              </div>
            </div>

            <RoadmapDocumentSheet
              open={viewOpen}
              mode="view"
              title={selectedNode.title}
              content={selectedNode.content}
              description={planningLabel(selectedNode)}
              saveLabel={t("common.save")}
              onOpenChange={setViewOpen}
            />
            <RoadmapDocumentSheet
              open={editOpen}
              mode="edit"
              title={selectedNode.title}
              content={selectedNode.content}
              description={planningLabel(selectedNode)}
              saveLabel={t("common.save")}
              onOpenChange={setEditOpen}
              onSave={async (input) => {
                await onSave({
                  nodeId: selectedNode.id,
                  ...input,
                  docStatus: selectedNode.docStatus,
                });
              }}
            />
          </article>
        ) : null}
      </div>
    </section>
  );
}
