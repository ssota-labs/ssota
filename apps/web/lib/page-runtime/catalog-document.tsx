"use client";

import type { Block, PartialBlock } from "@blocknote/core";
import { useCallback, useRef } from "react";
import { SsotaBlockNoteEditor } from "@/components/editor/blocknote-editor";

/**
 * Tolerant conversion of stored node content into BlockNote blocks. Accepts
 * either BlockNote document JSON (array) or a legacy plain/markdown string
 * (wrapped in a single paragraph) so existing documents keep rendering.
 */
function toBlocks(value: unknown): PartialBlock[] | undefined {
  if (Array.isArray(value)) return value as PartialBlock[];
  if (typeof value === "string" && value.trim().length > 0) {
    return [{ type: "paragraph", content: value }];
  }
  return undefined;
}

/** Read-only document (catalog `DocumentView`). */
export function DocumentViewEl({ content }: { content: unknown }) {
  return (
    <SsotaBlockNoteEditor editable={false} initialContent={toBlocks(content)} />
  );
}

/** Editable document (catalog `DocumentEditor`); debounced save via onSave. */
export function DocumentEditorEl({
  content,
  onSave,
}: {
  content: unknown;
  onSave: (blocks: Block[]) => void | Promise<void>;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleChange = useCallback(
    (blocks: Block[]) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        void onSave(blocks);
      }, 600);
    },
    [onSave],
  );
  return (
    <SsotaBlockNoteEditor
      editable
      initialContent={toBlocks(content)}
      onChange={handleChange}
    />
  );
}
