import { Extension } from "@tiptap/core";
import { wrappingInputRule } from "@tiptap/core";

/** 빈 줄에서 `""` 입력 시 Notion-style 인용 블록 생성 */
export const QuoteShortcut = Extension.create({
  name: "quoteShortcut",

  addInputRules() {
    const blockquote = this.editor.schema.nodes.blockquote;
    if (!blockquote) return [];

    return [
      wrappingInputRule({
        find: /^""$/,
        type: blockquote,
      }),
    ];
  },
});
