"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CaretDownIcon } from "@phosphor-icons/react";
import type { DocStatus } from "@/lib/roadmap/doc-status";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@ssota/ui/components/ui/collapsible";
import { useLocale } from "@/components/i18n/locale-provider";
import { RoadmapDocStatusControl } from "@/components/console/roadmap/roadmap-doc-status-control";
import { RoadmapDocumentPanel } from "@/components/console/roadmap/roadmap-document-panel";
import type { PlanningPeriod, RoadmapNodeView } from "@/lib/roadmap/types";

type PlanningRoadmapAccordionItemProps = {
  period: PlanningPeriod;
  year: number;
  node?: RoadmapNodeView;
  productRoadmapTitle: string;
  projectId: string;
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

export function PlanningRoadmapAccordionItem({
  period,
  year,
  node,
  productRoadmapTitle,
  projectId,
  defaultOpen = false,
  onCreate,
  onSave,
}: PlanningRoadmapAccordionItemProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
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

  const handleDocStatusChange = (value: DocStatus) => {
    if (!node) return;
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
      data-testid={`planning-roadmap-card-${cardTestId}`}
    >
      <CollapsibleTrigger
        nativeButton={false}
        render={
          <header className="sticky top-0 z-10 flex w-full cursor-pointer items-start justify-between gap-3 border-b bg-card px-4 py-3 text-left transition-colors hover:bg-muted/30 md:px-6" />
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
                <RoadmapDocStatusControl
                  value={node.docStatus ?? "draft"}
                  onChange={handleDocStatusChange}
                  disabled={pending}
                />
              </div>
            ) : null}
          </div>
        </div>
        <CaretDownIcon
          className={`mt-1 size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </CollapsibleTrigger>

      <CollapsibleContent
        className="border-b border-border"
        data-testid="planning-roadmap-detail"
      >
        <div className="space-y-4">
          {!node ? (
            <div className="px-4 py-4 md:px-6 md:py-6">
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
            </div>
          ) : node.content.trim() ? (
            <div className="px-4 py-4 md:px-6 md:py-6">
              <RoadmapDocumentPanel
                content={node.content}
                projectId={projectId}
                expandTestId={`planning-roadmap-expand-${cardTestId}`}
                onSave={async (input) => {
                  await onSave({
                    nodeId: node.id,
                    title: node.title,
                    content: input.content,
                  });
                }}
              />
            </div>
          ) : (
            <div className="px-4 py-4 md:px-6 md:py-6">
              <p className="text-sm text-muted-foreground">
                {t("roadmap.emptyPlanningDescription")}
              </p>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
