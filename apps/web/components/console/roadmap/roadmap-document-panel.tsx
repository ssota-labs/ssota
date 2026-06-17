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
import { MarkdownContent } from "@ssota/ui/components/page-patterns/markdown-content";
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
  const [editing, setEditing] = useState(false);
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
    if (!editing) {
      setDraftDoc(sourceDoc);
    }
  }, [editing, sourceDoc]);

  const handleToggleExpand = () => {
    setExpanded((current) => !current);
  };

  const handleEdit = () => {
    setDraftDoc(sourceDoc);
    setEditing(true);
    setExpanded(true);
  };

  const handleCancel = () => {
    setDraftDoc(sourceDoc);
    setEditing(false);
  };

  const handleSave = () => {
    startTransition(async () => {
      await onSave({ content: tiptapDocToMarkdown(draftDoc) });
      setEditing(false);
      router.refresh();
    });
  };

  return (
    <div className={cn("space-y-4", className)} data-testid="roadmap-document-panel">
      {!expanded ? (
        <div className="relative max-h-64 overflow-hidden rounded-md border bg-background">
          <div className="px-4 py-4">
            <MarkdownContent content={content} />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-20 items-end justify-center bg-gradient-to-t from-background via-background/95 to-transparent pb-2">
            <button
              type="button"
              data-testid={expandTestId}
              aria-expanded={false}
              aria-label={t("roadmap.expandContent")}
              className="pointer-events-auto inline-flex size-9 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
              onClick={handleToggleExpand}
            >
              <CaretDownIcon className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      ) : (
        <div
          className="relative rounded-md border bg-background"
          data-testid="roadmap-document-editor"
        >
          <div className="border-b px-4 py-2">
            <button
              type="button"
              data-testid={`${expandTestId}-collapse`}
              aria-expanded
              aria-label={t("roadmap.collapseContent")}
              className="mx-auto flex size-9 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
              onClick={handleToggleExpand}
            >
              <CaretDownIcon className="size-4 rotate-180" aria-hidden />
            </button>
          </div>
          <div className="px-4 py-4">
            <SsotaEditor
              key={editing ? "editing" : `readonly-${content.length}`}
              content={draftDoc}
              editable={editing}
              onChange={editing ? setDraftDoc : undefined}
              className="roadmap-readonly-editor"
              {...editorHostProps}
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        {editing ? (
          <>
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
          </>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={handleEdit}
            data-testid="roadmap-edit"
          >
            {t("roadmap.edit")}
          </Button>
        )}
      </div>
    </div>
  );
}
