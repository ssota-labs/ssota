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
