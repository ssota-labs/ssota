import { Extension, wrappingInputRule } from "@tiptap/core";

/** 빈 줄에서 `""` 입력 시 Notion-style 인용 블록 생성 */
const QUOTE_PATTERNS = [
  /^""$/,
  /^""\s$/,
  /^\u201c\u201d$/,
  /^\u201c\u201d\s$/,
  /^[\u0022\uff02]{2}$/,
  /^[\u0022\uff02]{2}\s$/,
] as const;

export const QuoteShortcut = Extension.create({
  name: "quoteShortcut",
  priority: 1000,

  addInputRules() {
    const blockquote = this.editor.schema.nodes.blockquote;
    if (!blockquote) return [];

    return QUOTE_PATTERNS.map((find) =>
      wrappingInputRule({
        find,
        type: blockquote,
      }),
    );
  },
});
