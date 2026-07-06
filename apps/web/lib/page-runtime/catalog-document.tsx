"use client";

import type { Block, PartialBlock } from "@blocknote/core";
import { useCallback, useRef } from "react";
import { SsotaBlockNoteEditor } from "@/components/editor/blocknote-editor";

/**
 * Tolerant conversion of stored node content into BlockNote blocks. Accepts
 * either BlockNote document JSON (array) or a legacy plain/markdown string
 * (wrapped in a single paragraph) so existing documents keep rendering.
 * Empty arrays are treated as unset — BlockNote rejects `initialContent: []`.
 */
export function toBlocks(value: unknown): PartialBlock[] | undefined {
  if (Array.isArray(value)) {
    if (value.length === 0) return undefined;
    return value as PartialBlock[];
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return [{ type: "paragraph", content: value }];
  }
  return undefined;
}

/** Read-only document (catalog `DocumentView`). */
export function DocumentViewEl({
  content,
  compact,
  onEditorReady,
}: {
  content: unknown;
  compact?: boolean;
  onEditorReady?: () => void;
}) {
  return (
    <SsotaBlockNoteEditor
      editable={false}
      initialContent={toBlocks(content)}
      compact={compact}
      onEditorReady={onEditorReady ? () => onEditorReady() : undefined}
    />
  );
}

/** Editable document (catalog `DocumentEditor`); debounced save via onSave. */
export function DocumentEditorEl({
  content,
  onSave,
  compact,
}: {
  content: unknown;
  onSave: (blocks: Block[]) => void | Promise<void>;
  compact?: boolean;
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
      compact={compact}
    />
  );
}
