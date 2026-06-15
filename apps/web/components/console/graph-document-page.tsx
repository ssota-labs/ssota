"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageFrame } from "@ssota/ui/components/page-patterns";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import { Textarea } from "@ssota/ui/components/ui/textarea";
import { Input } from "@ssota/ui/components/ui/input";

type GraphDocumentPageProps = {
  title: string;
  status: string;
  content: string;
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
  emptyDescription,
  onSave,
  meta,
}: GraphDocumentPageProps) {
  const router = useRouter();
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftContent, setDraftContent] = useState(content);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setDraftTitle(title);
    setDraftContent(content);
  }, [title, content]);

  const handleSave = () => {
    startTransition(async () => {
      await onSave({ title: draftTitle, content: draftContent });
      router.refresh();
    });
  };

  return (
    <PageFrame bodyClassName="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div className="min-w-0 flex-1 space-y-2">
          <Input
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            aria-label="Title"
            className="h-auto border-0 bg-transparent px-0 text-xl font-semibold tracking-tight shadow-none focus-visible:ring-0"
          />
          {meta}
        </div>
        {status ? <Badge variant="secondary">{status}</Badge> : null}
      </header>

      <Textarea
        value={draftContent}
        onChange={(e) => setDraftContent(e.target.value)}
        rows={16}
        className="min-h-[20rem] font-mono text-sm"
        aria-label="Content"
        placeholder={emptyDescription}
      />

      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={handleSave} disabled={pending}>
          Save
        </Button>
      </div>
    </PageFrame>
  );
}
