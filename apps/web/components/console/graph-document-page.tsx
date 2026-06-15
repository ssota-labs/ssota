"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PagePatternDocument } from "@ssota/ui/components/page-patterns";
import { Button } from "@ssota/ui/components/ui/button";
import { Textarea } from "@ssota/ui/components/ui/textarea";
import { Input } from "@ssota/ui/components/ui/input";

type GraphDocumentPageProps = {
  title: string;
  status: string;
  content: string;
  editLabel: string;
  emptyDescription: string;
  onSave: (input: {
    title: string;
    content: string;
  }) => Promise<void>;
  meta?: React.ReactNode;
};

export function GraphDocumentPage({
  title,
  status,
  content,
  editLabel,
  emptyDescription,
  onSave,
  meta,
}: GraphDocumentPageProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftContent, setDraftContent] = useState(content);
  const [pending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      await onSave({ title: draftTitle, content: draftContent });
      setEditing(false);
      router.refresh();
    });
  };

  if (editing) {
    return (
      <PagePatternDocument
        title={draftTitle}
        status={status}
        meta={meta}
        body={
          <div className="space-y-4">
            <Input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              aria-label="Title"
            />
            <Textarea
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              rows={16}
              className="font-mono text-sm"
              aria-label="Content"
            />
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={handleSave} disabled={pending}>
                Save
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setEditing(false)}
                disabled={pending}
              >
                Cancel
              </Button>
            </div>
          </div>
        }
      />
    );
  }

  return (
    <PagePatternDocument
      title={title}
      status={status}
      meta={meta}
      content={content || undefined}
      onEdit={() => {
        setDraftTitle(title);
        setDraftContent(content);
        setEditing(true);
      }}
      editLabel={editLabel}
      emptyState={
        !content ? (
          <p className="text-sm text-muted-foreground">{emptyDescription}</p>
        ) : undefined
      }
    />
  );
}
