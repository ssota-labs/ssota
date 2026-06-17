import { Extension } from "@tiptap/core";
import { findWrapping } from "@tiptap/pm/transform";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { parseListMarkerBeforeSpace } from "../list-marker-utils";

/**
 * IME·입력 타이밍에서 input rule이 놓칠 때 `- ` / `1. ` 등으로 리스트를 만든다.
 * QuoteShortcut과 동일한 handleTextInput 보완 패턴.
 */
export const ListMarkdownShortcut = Extension.create({
  name: "listMarkdownShortcut",
  priority: 1000,

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("ssotaListMarkdownShortcut"),
        props: {
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
            const marker = parseListMarkerBeforeSpace(beforeCursor);
            if (!marker) {
              return false;
            }

            const listType = state.schema.nodes[marker.listType];
            if (!listType) {
              return false;
            }

            let tr = state.tr.delete(blockStart, from + 1);
            const $blockStart = tr.doc.resolve(blockStart);
            const blockRange = $blockStart.blockRange();
            if (!blockRange) {
              return false;
            }

            const attrs =
              marker.listType === "orderedList" && marker.orderedStart
                ? { start: marker.orderedStart }
                : undefined;
            const wrapping = findWrapping(blockRange, listType, attrs);
            if (!wrapping) {
              return false;
            }

            tr = tr.wrap(blockRange, wrapping);
            tr.setSelection(
              TextSelection.near(
                tr.doc.resolve(Math.min(blockStart + 2, tr.doc.content.size - 1)),
              ),
            );

            view.dispatch(tr);
            return true;
          },
        },
      }),
    ];
  },
});
