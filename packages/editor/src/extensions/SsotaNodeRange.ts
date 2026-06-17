import NodeRange from "@tiptap/extension-node-range";
import {
  getNodeRangeDecorations,
  getSelectionRanges,
  isNodeRangeSelection,
  NodeRangeSelection,
} from "@tiptap/extension-node-range";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { resolveBlockSelectionDepth } from "../node-range-depth";

/**
 * 기본 NodeRange는 depth를 document block 기준으로 추론해
 * 중첩 리스트에서 부모 listItem 전체가 한 번에 선택된다.
 * 가장 안쪽 listItem depth를 쓰도록 보정한다.
 */
export const SsotaNodeRange = NodeRange.extend({
  addKeyboardShortcuts() {
    const parentShortcuts = this.parent?.() ?? {};

    const withResolvedDepth = (
      factory: (depth: number | undefined) => NodeRangeSelection,
    ) => {
      const { doc, selection, tr } = this.editor.state;
      const { anchor, head } = selection;
      const depth = resolveBlockSelectionDepth(
        doc.resolve(anchor),
        doc.resolve(head),
        this.options.depth,
      );
      tr.setSelection(factory(depth));
      this.editor.view.dispatch(tr);
      return true;
    };

    return {
      ...parentShortcuts,
      "Shift-ArrowUp": ({ editor }) => {
        const { selection, tr } = editor.state;
        if (!isNodeRangeSelection(selection)) {
          return withResolvedDepth((depth) =>
            NodeRangeSelection.create(
              editor.state.doc,
              selection.anchor,
              selection.head,
              depth,
              -1,
            ),
          );
        }
        tr.setSelection(selection.extendBackwards());
        editor.view.dispatch(tr);
        return true;
      },
      "Shift-ArrowDown": ({ editor }) => {
        const { selection, tr } = editor.state;
        if (!isNodeRangeSelection(selection)) {
          return withResolvedDepth((depth) =>
            NodeRangeSelection.create(
              editor.state.doc,
              selection.anchor,
              selection.head,
              depth,
            ),
          );
        }
        tr.setSelection(selection.extendForwards());
        editor.view.dispatch(tr);
        return true;
      },
      "Mod-a": ({ editor }) => {
        const { doc, tr } = editor.state;
        const depth = resolveBlockSelectionDepth(
          doc.resolve(0),
          doc.resolve(doc.content.size),
          this.options.depth,
        );
        tr.setSelection(
          NodeRangeSelection.create(doc, 0, doc.content.size, depth),
        );
        editor.view.dispatch(tr);
        return true;
      },
    };
  },

  addProseMirrorPlugins() {
    let hideTextSelection = false;
    let activeMouseSelection = false;

    return [
      new Plugin({
        key: new PluginKey("nodeRange"),
        props: {
          attributes: () => {
            if (hideTextSelection) {
              return { class: "ProseMirror-noderangeselection" };
            }
            return { class: "" };
          },
          handleDOMEvents: {
            mousedown: (view, event) => {
              const { key } = this.options;
              const isMac = /Mac/.test(navigator.platform);
              const isShift = !!event.shiftKey;
              const isControl = !!event.ctrlKey;
              const isAlt = !!event.altKey;
              const isMeta = !!event.metaKey;
              const isMod = isMac ? isMeta : isControl;

              if (
                key === null ||
                key === undefined ||
                (key === "Shift" && isShift) ||
                (key === "Control" && isControl) ||
                (key === "Alt" && isAlt) ||
                (key === "Meta" && isMeta) ||
                (key === "Mod" && isMod)
              ) {
                activeMouseSelection = true;
              }

              if (!activeMouseSelection) {
                return false;
              }

              document.addEventListener(
                "mouseup",
                () => {
                  activeMouseSelection = false;
                  const { state } = view;
                  const { doc, selection, tr } = state;
                  const { $anchor, $head } = selection;
                  if ($anchor.sameParent($head)) {
                    return;
                  }
                  const depth = resolveBlockSelectionDepth(
                    $anchor,
                    $head,
                    this.options.depth,
                  );
                  tr.setSelection(
                    NodeRangeSelection.create(
                      doc,
                      $anchor.pos,
                      $head.pos,
                      depth,
                    ),
                  );
                  view.dispatch(tr);
                },
                { once: true },
              );

              return false;
            },
          },
          decorations: (state) => {
            const { selection } = state;
            const isNodeRange = isNodeRangeSelection(selection);
            hideTextSelection = false;

            if (!activeMouseSelection) {
              if (!isNodeRange) {
                return null;
              }
              hideTextSelection = true;
              return getNodeRangeDecorations([...selection.ranges]);
            }

            const { $from, $to } = selection;
            if (!isNodeRange && $from.sameParent($to)) {
              return null;
            }

            const depth = resolveBlockSelectionDepth(
              $from,
              $to,
              this.options.depth,
            );
            const nodeRanges = getSelectionRanges($from, $to, depth);
            if (!nodeRanges.length) {
              return null;
            }

            hideTextSelection = true;
            return getNodeRangeDecorations(nodeRanges);
          },
        },
      }),
    ];
  },
});
