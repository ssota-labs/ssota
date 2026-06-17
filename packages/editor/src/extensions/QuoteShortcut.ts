import { Extension } from "@tiptap/core";
import { findWrapping } from "@tiptap/pm/transform";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";

const QUOTE_TRIGGER_CHARS = new Set(['"', "\u201c", "\u201d", "\uff02"]);

function isQuoteTrigger(text: string): boolean {
  return QUOTE_TRIGGER_CHARS.has(text);
}

/** 빈 줄 맨 앞에서 `"` 입력 시 Notion-style 인용 블록 생성 */
export const QuoteShortcut = Extension.create({
  name: "quoteShortcut",
  priority: 1000,

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("ssotaQuoteShortcut"),
        props: {
          handleTextInput: (view, from, _to, text) => {
            if (!isQuoteTrigger(text) || view.composing) {
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
            if (beforeCursor.length > 0) {
              return false;
            }

            const blockquote = state.schema.nodes.blockquote;
            if (!blockquote) {
              return false;
            }

            const $blockStart = state.doc.resolve(blockStart);
            const blockRange = $blockStart.blockRange();
            if (!blockRange) {
              return false;
            }

            const wrapping = findWrapping(blockRange, blockquote);
            if (!wrapping) {
              return false;
            }

            const tr = state.tr.wrap(blockRange, wrapping);
            const cursorPos = Math.min(
              blockStart + 1,
              tr.doc.content.size - 1,
            );
            tr.setSelection(TextSelection.near(tr.doc.resolve(cursorPos)));

            view.dispatch(tr);
            return true;
          },
        },
      }),
    ];
  },
});
