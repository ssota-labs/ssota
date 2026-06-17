"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { useLocale } from "@/components/i18n/locale-provider";
import { RoadmapDocumentSheet } from "@/components/console/roadmap/roadmap-document-sheet";
import { RoadmapMarkdownPreview } from "@/components/console/roadmap/roadmap-markdown-preview";
import {
  DOC_STATUS_LABELS,
  DOC_STATUS_OPTIONS,
} from "@/lib/roadmap/doc-status";
import type { RoadmapNodeView } from "@/lib/roadmap/types";

type ProductRoadmapCardProps = {
  node: RoadmapNodeView;
  onSave: (input: {
    title: string;
    content: string;
    docStatus?: DocStatus;
  }) => Promise<void>;
  onApplyTemplate: () => Promise<void>;
};

export function ProductRoadmapCard({
  node,
  onSave,
  onApplyTemplate,
}: ProductRoadmapCardProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const isEmpty = !node.content.trim();
  const docStatus = node.docStatus ?? "draft";

  const handleDocStatusChange = (value: DocStatus | null) => {
    if (!value) return;
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
      <header className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3 md:px-6">
        <div className="min-w-0 space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">
            {t("roadmap.productRoadmap")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {node.title.trim() ? node.title : t("roadmap.description")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={docStatus}
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
          <Badge variant="secondary">{DOC_STATUS_LABELS[docStatus]}</Badge>
        </div>
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
          <RoadmapMarkdownPreview content={node.content} />
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isEmpty}
            data-testid="product-roadmap-view-full"
            onClick={() => setViewOpen(true)}
          >
            {t("roadmap.viewFull")}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isEmpty && pending}
            onClick={() => setEditOpen(true)}
          >
            {t("roadmap.edit")}
          </Button>
        </div>
      </div>

      <RoadmapDocumentSheet
        open={viewOpen}
        mode="view"
        title={node.title}
        content={node.content}
        description={t("roadmap.productRoadmap")}
        saveLabel={t("common.save")}
        onOpenChange={setViewOpen}
      />
      <RoadmapDocumentSheet
        open={editOpen}
        mode="edit"
        title={node.title}
        content={node.content}
        description={t("roadmap.productRoadmap")}
        saveLabel={t("common.save")}
        onOpenChange={setEditOpen}
        onSave={async (input) => {
          await onSave({ ...input, docStatus });
        }}
      />
    </section>
  );
}
