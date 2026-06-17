import { Extension, wrappingInputRule } from "@tiptap/core";
import { findWrapping } from "@tiptap/pm/transform";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";

/** 빈 줄 맨 앞에서 `" ` (따옴표+스페이스) 입력 시 Notion-style 인용 블록 생성 */
const QUOTE_SPACE_PATTERNS = [
  /^"\s$/,
  /^\u201c\s$/,
  /^\u201d\s$/,
  /^\uff02\s$/,
] as const;

const QUOTE_ONLY_PATTERN = /^["\u201c\u201d\uff02]$/;

export const QuoteShortcut = Extension.create({
  name: "quoteShortcut",
  priority: 1000,

  addInputRules() {
    const blockquote = this.editor.schema.nodes.blockquote;
    if (!blockquote) return [];

    return QUOTE_SPACE_PATTERNS.map((find) =>
      wrappingInputRule({
        find,
        type: blockquote,
      }),
    );
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("ssotaQuoteShortcut"),
        props: {
          // IME·키보드 레이아웃에서 input rule이 놓칠 때 스페이스 입력으로 보완
          handleTextInput: (view, from, _to, text) => {
            if (text !== " " || view.composing) {
              return false;
            }

            const { state } = view;
            const $from = state.doc.resolve(from);
            const parent = $from.parent;

            if (!parent.isTextblock || parent.type.spec.code) {
              return false;
            }

            const blockStart = $from.start();
            const beforeCursor = state.doc.textBetween(blockStart, from);
            if (!QUOTE_ONLY_PATTERN.test(beforeCursor)) {
              return false;
            }

            const blockquote = state.schema.nodes.blockquote;
            if (!blockquote) {
              return false;
            }

            let tr = state.tr.delete(blockStart, from);
            const $blockStart = tr.doc.resolve(blockStart);
            const blockRange = $blockStart.blockRange();
            if (!blockRange) {
              return false;
            }

            const wrapping = findWrapping(blockRange, blockquote);
            if (!wrapping) {
              return false;
            }

            tr = tr.wrap(blockRange, wrapping);
            tr.setSelection(
              TextSelection.near(tr.doc.resolve(Math.min(blockStart + 1, tr.doc.content.size - 1))),
            );

            view.dispatch(tr);
            return true;
          },
        },
      }),
    ];
  },
});
