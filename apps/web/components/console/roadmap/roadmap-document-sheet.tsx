"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MarkdownContent } from "@ssota/ui/components/page-patterns/markdown-content";
import { Button } from "@ssota/ui/components/ui/button";
import { Input } from "@ssota/ui/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@ssota/ui/components/ui/sheet";
import { Textarea } from "@ssota/ui/components/ui/textarea";

type RoadmapDocumentSheetProps = {
  open: boolean;
  mode: "view" | "edit";
  title: string;
  content: string;
  description?: string;
  saveLabel: string;
  onOpenChange: (open: boolean) => void;
  onSave?: (input: { title: string; content: string }) => Promise<void>;
};

export function RoadmapDocumentSheet({
  open,
  mode,
  title,
  content,
  description,
  saveLabel,
  onOpenChange,
  onSave,
}: RoadmapDocumentSheetProps) {
  const router = useRouter();
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftContent, setDraftContent] = useState(content);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setDraftTitle(title);
    setDraftContent(content);
  }, [open, title, content]);

  const handleSave = () => {
    if (!onSave) return;
    startTransition(async () => {
      await onSave({ title: draftTitle, content: draftContent });
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
