import { MarkdownManager } from "@tiptap/markdown";
import type { JSONContent } from "@tiptap/react";
import { ssotaExtensions } from "./extensions";
import { emptyTiptapDoc, isTiptapDoc, parseTiptapDoc, type TiptapDoc } from "./json";

let markdownManager: MarkdownManager | null = null;

function getMarkdownManager(): MarkdownManager {
  if (!markdownManager) {
    markdownManager = new MarkdownManager({
      extensions: ssotaExtensions(),
    });
  }
  return markdownManager;
}

export function markdownToTiptapDoc(markdown: string | null | undefined): TiptapDoc {
  const trimmed = markdown?.trim();
  if (!trimmed) return emptyTiptapDoc();

  const parsed = getMarkdownManager().parse(trimmed);
  if (!isTiptapDoc(parsed)) {
    return emptyTiptapDoc();
  }
  return parseTiptapDoc(parsed);
}

export function tiptapDocToMarkdown(doc: JSONContent | null | undefined): string {
  if (!doc || !isTiptapDoc(doc)) return "";
  return getMarkdownManager().serialize(doc).trim();
}
