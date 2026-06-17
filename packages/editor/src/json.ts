import type { JSONContent } from "@tiptap/react";

export type TiptapDoc = JSONContent & { type: "doc" };

export function isTiptapDoc(value: unknown): value is TiptapDoc {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as { type?: unknown; content?: unknown };
  if (candidate.type !== "doc") return false;
  return candidate.content === undefined || Array.isArray(candidate.content);
}

export function parseTiptapDoc(value: unknown): TiptapDoc {
  if (!isTiptapDoc(value)) {
    throw new Error("Expected Tiptap doc JSON");
  }
  return value;
}

export function emptyTiptapDoc(): TiptapDoc {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

export function tiptapDocToPlainText(doc: JSONContent | null | undefined): string {
  if (!doc) return "";

  const chunks: string[] = [];

  function walk(node: JSONContent) {
    if (node.type === "text" && typeof node.text === "string") {
      chunks.push(node.text);
      return;
    }

    if (node.type === "mention") {
      const label = String(node.attrs?.label ?? node.attrs?.id ?? "");
      chunks.push(`@${label}`);
      return;
    }

    if (node.type === "emoji") {
      chunks.push(String(node.attrs?.emoji ?? node.attrs?.name ?? ""));
      return;
    }

    if (node.type === "hardBreak") {
      chunks.push("\n");
      return;
    }

    const children = node.content ?? [];
    for (const child of children) {
      walk(child);
    }

    if (
      node.type === "paragraph" ||
      node.type === "heading" ||
      node.type === "listItem" ||
      node.type === "taskItem" ||
      node.type === "blockquote" ||
      node.type === "callout" ||
      node.type === "toggle"
    ) {
      chunks.push("\n");
    }
  }

  walk(doc);
  return chunks.join("").replace(/\n{3,}/g, "\n\n").trim();
}

export function plainTextToTiptapDoc(value: string | null | undefined): TiptapDoc {
  const text = value?.trim();
  if (!text) return emptyTiptapDoc();

  return {
    type: "doc",
    content: text.split(/\n{2,}/).map((paragraph) => ({
      type: "paragraph",
      content: [{ type: "text", text: paragraph }],
    })),
  };
}
