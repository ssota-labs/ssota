import { Extension, wrappingInputRule } from "@tiptap/core";

/** 빈 줄에서 `""` 입력 시 Notion-style 인용 블록 생성 */
const STRAIGHT_DOUBLE_QUOTE = /^""$/;
const CURLY_DOUBLE_QUOTE = /^\u201c\u201d$/;

export const QuoteShortcut = Extension.create({
  name: "quoteShortcut",
  priority: 1000,

  addInputRules() {
    const blockquote = this.editor.schema.nodes.blockquote;
    if (!blockquote) return [];

    return [
      wrappingInputRule({
        find: STRAIGHT_DOUBLE_QUOTE,
        type: blockquote,
      }),
      wrappingInputRule({
        find: CURLY_DOUBLE_QUOTE,
        type: blockquote,
      }),
    ];
  },
});
