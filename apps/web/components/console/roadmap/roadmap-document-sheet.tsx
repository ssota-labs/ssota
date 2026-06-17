"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MarkdownContent } from "@ssota/ui/components/page-patterns/markdown-content";
import { Button } from "@ssota/ui/components/ui/button";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ssota/ui/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@ssota/ui/components/ui/sheet";
import { Textarea } from "@ssota/ui/components/ui/textarea";
import { useLocale } from "@/components/i18n/locale-provider";
import {
  DOC_STATUS_LABELS,
  DOC_STATUS_OPTIONS,
  type DocStatus,
} from "@/lib/roadmap/doc-status";

type RoadmapDocumentSheetProps = {
  open: boolean;
  mode: "view" | "edit";
  title: string;
  content: string;
  description?: string;
  docStatus?: DocStatus;
  saveLabel: string;
  onOpenChange: (open: boolean) => void;
  onSave?: (input: {
    title: string;
    content: string;
    docStatus?: DocStatus;
  }) => Promise<void>;
};

export function RoadmapDocumentSheet({
  open,
  mode,
  title,
  content,
  description,
  docStatus = "draft",
  saveLabel,
  onOpenChange,
  onSave,
}: RoadmapDocumentSheetProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftContent, setDraftContent] = useState(content);
  const [draftDocStatus, setDraftDocStatus] = useState<DocStatus>(docStatus);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setDraftTitle(title);
    setDraftContent(content);
    setDraftDocStatus(docStatus);
  }, [open, title, content, docStatus]);

  const handleSave = () => {
    if (!onSave) return;
    startTransition(async () => {
      await onSave({
        title: draftTitle,
        content: draftContent,
        docStatus: draftDocStatus,
      });
      router.refresh();
      onOpenChange(false);
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="half" className="overflow-y-auto">
        <SheetHeader>
          {mode === "edit" ? (
            <Input
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              aria-label="Title"
              className="h-auto border-0 bg-transparent px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
            />
          ) : (
            <SheetTitle>{title}</SheetTitle>
          )}
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>

        <div className="space-y-4 px-4 pb-4">
          {mode === "view" ? (
            <MarkdownContent content={content} />
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="roadmap-doc-status">{t("roadmap.docStatusLabel")}</Label>
                <Select
                  value={draftDocStatus}
                  onValueChange={(value) => {
                    if (value) setDraftDocStatus(value as DocStatus);
                  }}
                  disabled={pending}
                >
                  <SelectTrigger id="roadmap-doc-status" size="sm">
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
              <Textarea
                value={draftContent}
                onChange={(event) => setDraftContent(event.target.value)}
                rows={24}
                className="min-h-[24rem] font-mono text-sm"
                aria-label="Content"
              />
              <Button type="button" size="sm" onClick={handleSave} disabled={pending}>
                {saveLabel}
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
