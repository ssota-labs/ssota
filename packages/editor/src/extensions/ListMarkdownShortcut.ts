import { Extension } from "@tiptap/core";
import { findWrapping } from "@tiptap/pm/transform";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { applyListType, findInnermostList } from "../list-commands";
import { parseListMarkerBeforeSpace } from "../list-marker-utils";

/**
 * `- ` / `* ` / `1. ` / `a. ` 입력으로 리스트를 만들거나, 이미 리스트 안이면
 * 현재 들여쓰기 레벨의 타입만 bullet ↔ numbered로 전환한다.
 */
export const ListMarkdownShortcut = Extension.create({
  name: "listMarkdownShortcut",
  priority: 1000,

  addProseMirrorPlugins() {
    const getEditor = () => this.editor;

    return [
      new Plugin({
        key: new PluginKey("ssotaListMarkdownShortcut"),
        priority: 1000,
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

            const listTypeNode = state.schema.nodes[marker.listType];
            if (!listTypeNode) {
              return false;
            }

            const innermost = findInnermostList($from);
            // Space is not in the document yet; `from` is the insertion point after the marker.
            const markerEnd = from;
            let tr = state.tr.delete(blockStart, markerEnd);

            if (innermost) {
              tr.setSelection(
                TextSelection.near(
                  tr.doc.resolve(Math.min(blockStart + 1, tr.doc.content.size - 1)),
                ),
              );
              view.dispatch(tr);

              if (innermost.type !== marker.listType) {
                const editor = getEditor();
                if (editor) {
                  applyListType(editor, marker.listType, marker.orderedStart);
                }
              }

              return true;
            }

            const $blockStart = tr.doc.resolve(blockStart);
            const blockRange = $blockStart.blockRange();
            if (!blockRange) {
              return false;
            }

            const attrs =
              marker.listType === "orderedList" && marker.orderedStart
                ? { start: marker.orderedStart }
                : undefined;
            const wrapping = findWrapping(blockRange, listTypeNode, attrs);
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
