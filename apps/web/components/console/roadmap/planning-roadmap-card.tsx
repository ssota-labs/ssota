"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CaretDownIcon } from "@phosphor-icons/react";
import type { RoadmapQuarter } from "@ssota/contracts";
import type { DocStatus } from "@/lib/roadmap/doc-status";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@ssota/ui/components/ui/collapsible";
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

type PlanningRoadmapCardProps = {
  period: PlanningPeriod;
  year: number;
  node?: RoadmapNodeView;
  productRoadmapTitle: string;
  defaultOpen?: boolean;
  onCreate: () => Promise<void>;
  onSave: (input: {
    nodeId: string;
    title: string;
    content: string;
    docStatus?: DocStatus;
  }) => Promise<void>;
};

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

function periodTestId(period: PlanningPeriod) {
  return period === "annual" ? "annual" : `q${period}`;
}

function breadcrumbSuffix(year: number, period: PlanningPeriod) {
  return period === "annual" ? ` › ${year} 연간` : ` › Q${period}`;
}

export function PlanningRoadmapCard({
  period,
  year,
  node,
  productRoadmapTitle,
  defaultOpen = false,
  onCreate,
  onSave,
}: PlanningRoadmapCardProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const cardTestId = periodTestId(period);

  const handleCreate = () => {
    if (node || pending) return;

    startTransition(async () => {
      try {
        await onCreate();
      } finally {
        router.refresh();
      }
    });
  };

  const handleDocStatusChange = (value: DocStatus | null) => {
    if (!node || !value) return;
    startTransition(async () => {
      await onSave({
        nodeId: node.id,
        title: node.title,
        content: node.content,
        docStatus: value,
      });
      router.refresh();
    });
  };

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-md border bg-muted/20"
      data-testid={`planning-roadmap-card-${cardTestId}`}
    >
      <article data-testid="planning-roadmap-detail">
        <CollapsibleTrigger
          nativeButton={false}
          render={
            <header className="flex w-full cursor-pointer items-start justify-between gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-muted/30" />
          }
        >
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-xs text-muted-foreground">
              {productRoadmapTitle}
              {breadcrumbSuffix(year, period)}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold">
                {node ? planningLabel(node) : targetTitle(year, period)}
              </h3>
              {node ? (
                <div
                  className="inline-flex"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <Select
                    value={node.docStatus ?? "draft"}
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
              ) : null}
            </div>
          </div>
          <CaretDownIcon
            className={`mt-1 size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-4 p-4 md:p-6">
          {!node ? (
            <div
              className="rounded-md border border-dashed bg-muted/10 p-6 text-center"
              data-testid={`planning-roadmap-empty-${cardTestId}`}
            >
              <p className="text-sm text-muted-foreground">
                {t("roadmap.emptyPlanningNotCreated")}
              </p>
              <Button
                type="button"
                size="sm"
                className="mt-4"
                disabled={pending}
                data-testid={`planning-roadmap-create-${cardTestId}`}
                onClick={handleCreate}
              >
                {period === "annual"
                  ? t("roadmap.createAnnual")
                  : t("roadmap.createQuarter", { quarter: period })}
              </Button>
            </div>
          ) : node.content.trim() ? (
            <RoadmapMarkdownPreview content={node.content} />
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("roadmap.emptyPlanningDescription")}
            </p>
          )}

          {node ? (
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!node.content.trim()}
                onClick={() => setViewOpen(true)}
              >
                {t("roadmap.viewFull")}
              </Button>
              <Button type="button" size="sm" onClick={() => setEditOpen(true)}>
                {t("roadmap.edit")}
              </Button>
            </div>
          ) : null}
        </CollapsibleContent>

        {node ? (
          <>
            <RoadmapDocumentSheet
              open={viewOpen}
              mode="view"
              title={node.title}
              content={node.content}
              description={planningLabel(node)}
              saveLabel={t("common.save")}
              onOpenChange={setViewOpen}
            />
            <RoadmapDocumentSheet
              open={editOpen}
              mode="edit"
              title={node.title}
              content={node.content}
              description={planningLabel(node)}
              saveLabel={t("common.save")}
              onOpenChange={setEditOpen}
              onSave={async (input) => {
                await onSave({
                  nodeId: node.id,
                  ...input,
                  docStatus: node.docStatus,
                });
              }}
            />
          </>
        ) : null}
      </article>
    </Collapsible>
  );
}
