"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DocStatus } from "@/lib/roadmap/doc-status";
import { Button } from "@ssota/ui/components/ui/button";
import { useLocale } from "@/components/i18n/locale-provider";
import { RoadmapDocStatusControl } from "@/components/console/roadmap/roadmap-doc-status-control";
import { RoadmapDocumentPanel } from "@/components/console/roadmap/roadmap-document-panel";
import type { RoadmapNodeView } from "@/lib/roadmap/types";

type ProductRoadmapCardProps = {
  node: RoadmapNodeView;
  projectId: string;
  onSave: (input: {
    title: string;
    content: string;
    docStatus?: DocStatus;
  }) => Promise<void>;
  onApplyTemplate: () => Promise<void>;
};

export function ProductRoadmapCard({
  node,
  projectId,
  onSave,
  onApplyTemplate,
}: ProductRoadmapCardProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const isEmpty = !node.content.trim();
  const docStatus = node.docStatus ?? "draft";

  const handleDocStatusChange = (value: DocStatus) => {
    startTransition(async () => {
      await onSave({
        title: node.title,
        content: node.content,
        docStatus: value,
      });
      router.refresh();
    });
  };

  const handleApplyTemplate = () => {
    startTransition(async () => {
      await onApplyTemplate();
      router.refresh();
    });
  };

  return (
    <section
      className="rounded-lg border bg-card"
      data-testid="product-roadmap-card"
    >
      <header className="sticky top-0 z-10 border-b bg-card px-4 py-3 md:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight">
            {t("roadmap.productRoadmap")}
          </h2>
          <RoadmapDocStatusControl
            value={docStatus}
            onChange={handleDocStatusChange}
            disabled={pending}
          />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("roadmap.productRoadmapDescription")}
        </p>
      </header>

      <div className="space-y-4 p-4 md:p-6">
        {isEmpty ? (
          <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {t("roadmap.emptyProductDescription")}
            </p>
            <Button
              type="button"
              size="sm"
              className="mt-4"
              disabled={pending}
              onClick={handleApplyTemplate}
            >
              {t("roadmap.startFromTemplate")}
            </Button>
          </div>
        ) : (
          <RoadmapDocumentPanel
            content={node.content}
            projectId={projectId}
            expandTestId="product-roadmap-expand"
            onSave={async (input) => {
              await onSave({
                title: node.title,
                content: input.content,
              });
            }}
          />
        )}
      </div>
    </section>
  );
}
