import { Node, mergeAttributes } from "@tiptap/core";
import type { Editor } from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";

function getCalloutTitleContext(editor: Editor) {
  const { $from } = editor.state.selection;

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name !== "calloutTitle") continue;

    const calloutDepth = depth - 1;
    if ($from.node(calloutDepth).type.name !== "callout") return null;

    return { calloutDepth, titleDepth: depth };
  }

  return null;
}

/** Notion-style callout 제목 — Enter 시 본문으로 이동 */
export const CalloutTitle = Node.create({
  name: "calloutTitle",
  content: "inline*",
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-callout-title]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-callout-title": "",
        class: "ssota-callout-title",
        "data-placeholder": "제목",
      }),
      0,
    ];
  },

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const context = getCalloutTitleContext(editor);
        if (!context) return false;

        const { calloutDepth } = context;
        const callout = editor.state.selection.$from.node(calloutDepth);
        const calloutStart = editor.state.selection.$from.start(calloutDepth);
        const afterTitlePos = calloutStart + callout.child(0).nodeSize;

        if (callout.childCount === 1) {
          return editor
            .chain()
            .insertContentAt(afterTitlePos, { type: "paragraph" })
            .setTextSelection(afterTitlePos + 1)
            .run();
        }

        const bodyStart = afterTitlePos + 1;
        return editor.chain().setTextSelection(bodyStart).focus().run();
      },

      Backspace: ({ editor }) => {
        const context = getCalloutTitleContext(editor);
        if (!context) return false;

        const { $from } = editor.state.selection;
        const atTitleStart = $from.parentOffset === 0;
        const titleEmpty = $from.parent.content.size === 0;

        if (atTitleStart && titleEmpty) {
          return true;
        }

        return false;
      },

      ArrowDown: ({ editor }) => {
        const context = getCalloutTitleContext(editor);
        if (!context || editor.state.selection.$from.parentOffset !== editor.state.selection.$from.parent.content.size) {
          return false;
        }

        const { calloutDepth } = context;
        const callout = editor.state.selection.$from.node(calloutDepth);
        if (callout.childCount < 2) return false;

        const calloutStart = editor.state.selection.$from.start(calloutDepth);
        const bodyStart = calloutStart + callout.child(0).nodeSize + 1;
        return editor.chain().setTextSelection(bodyStart).focus().run();
      },

      ArrowUp: ({ editor }) => {
        const { $from } = editor.state.selection;
        const parent = $from.parent;

        if (parent.type.name !== "paragraph") return false;

        const calloutDepth = $from.depth - 1;
        if ($from.node(calloutDepth).type.name !== "callout") return false;
        if ($from.index(calloutDepth) !== 1) return false;
        if ($from.parentOffset !== 0) return false;

        const titlePos = $from.start(calloutDepth) + 1;
        const titleNode = $from.node(calloutDepth).child(0);
        const titleEnd = titlePos + titleNode.content.size;

        return editor
          .chain()
          .command(({ tr, dispatch }) => {
            if (dispatch) {
              tr.setSelection(TextSelection.create(tr.doc, titleEnd));
            }
            return true;
          })
          .focus()
          .run();
      },
    };
  },
});
