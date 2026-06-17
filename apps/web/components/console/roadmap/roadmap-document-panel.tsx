"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CaretDownIcon } from "@phosphor-icons/react";
import {
  markdownToTiptapDoc,
  SsotaEditor,
  tiptapDocToMarkdown,
  type JSONContent,
} from "@ssota/editor";
import "@ssota/editor/styles.css";
import { Button } from "@ssota/ui/components/ui/button";
import { cn } from "@ssota/ui/lib/utils";
import { useLocale } from "@/components/i18n/locale-provider";
import { createSsotaEditorHostProps } from "@/lib/editor/host-props";

type RoadmapDocumentPanelProps = {
  content: string;
  projectId: string;
  onSave: (input: { content: string }) => Promise<void>;
  expandTestId?: string;
  className?: string;
};

export function RoadmapDocumentPanel({
  content,
  projectId,
  onSave,
  expandTestId = "roadmap-expand",
  className,
}: RoadmapDocumentPanelProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [draftDoc, setDraftDoc] = useState<JSONContent>(() =>
    markdownToTiptapDoc(content),
  );
  const [pending, startTransition] = useTransition();

  const editorHostProps = useMemo(
    () => createSsotaEditorHostProps(projectId),
    [projectId],
  );

  const sourceDoc = useMemo(() => markdownToTiptapDoc(content), [content]);

  useEffect(() => {
    if (!expanded) {
      setDraftDoc(sourceDoc);
    }
  }, [expanded, sourceDoc]);

  const handleExpand = () => {
    setDraftDoc(sourceDoc);
    setExpanded(true);
  };

  const handleCollapse = () => {
    setDraftDoc(sourceDoc);
    setExpanded(false);
  };

  const handleCancel = () => {
    handleCollapse();
  };

  const handleSave = () => {
    startTransition(async () => {
      await onSave({ content: tiptapDocToMarkdown(draftDoc) });
      router.refresh();
    });
  };

  return (
    <div
      className={cn("space-y-4", className)}
      data-testid="roadmap-document-panel"
    >
      <div
        className={cn(!expanded && "relative max-h-64 overflow-hidden")}
        data-testid="roadmap-document-editor"
      >
        <SsotaEditor
          key={expanded ? "editing" : "readonly"}
          content={draftDoc}
          editable={expanded}
          onChange={expanded ? setDraftDoc : undefined}
          className={cn("roadmap-readonly-editor", expanded && "pb-20")}
          {...editorHostProps}
        />

        {!expanded ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-20 items-end justify-center bg-gradient-to-t from-card via-card/95 to-transparent pb-2">
            <button
              type="button"
              data-testid={expandTestId}
              aria-expanded={false}
              aria-label={t("roadmap.expandContent")}
              className="pointer-events-auto inline-flex size-9 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
              onClick={handleExpand}
            >
              <CaretDownIcon className="size-4" aria-hidden />
            </button>
          </div>
        ) : (
          <div className="pointer-events-none sticky bottom-0 z-10 -mt-20 flex h-20 items-end justify-center bg-gradient-to-t from-card via-card/95 to-transparent pb-2">
            <button
              type="button"
              data-testid={`${expandTestId}-collapse`}
              aria-expanded
              aria-label={t("roadmap.collapseContent")}
              className="pointer-events-auto inline-flex size-9 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
              onClick={handleCollapse}
            >
              <CaretDownIcon className="size-4 rotate-180" aria-hidden />
            </button>
          </div>
        )}
      </div>

      {expanded ? (
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={handleCancel}
            data-testid="roadmap-edit-cancel"
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={handleSave}
            data-testid="roadmap-edit-save"
          >
            {t("common.save")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
