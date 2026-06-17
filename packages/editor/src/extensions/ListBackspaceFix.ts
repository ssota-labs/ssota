import { Extension } from "@tiptap/core";
import type { Editor } from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";

const LIST_WRAPPER_TYPES = new Set(["bulletList", "orderedList", "taskList"]);

function isEmptyTextblockAtStart(state: Editor["state"]): boolean {
  const { $from, empty } = state.selection;
  return (
    empty &&
    $from.parent.isTextblock &&
    $from.parentOffset === 0 &&
    $from.parent.content.size === 0
  );
}

/** 리스트 바로 다음 빈 문단 — ListKeymap hasListBefore가 새 항목을 만드는 케이스 */
function emptyParagraphAfterList(state: Editor["state"]) {
  if (!isEmptyTextblockAtStart(state)) {
    return null;
  }

  const { $from } = state.selection;
  const paragraphPos = $from.before();
  if (paragraphPos <= 0) {
    return null;
  }

  const listNode = state.doc.resolve(paragraphPos).nodeBefore;
  if (!listNode || !LIST_WRAPPER_TYPES.has(listNode.type.name)) {
    return null;
  }

  return {
    paragraphPos,
    paragraphSize: $from.parent.nodeSize,
    cursorPos: paragraphPos - 1,
  };
}

function deleteEmptyParagraphAfterList(editor: Editor): boolean {
  const context = emptyParagraphAfterList(editor.state);
  if (!context) {
    return false;
  }

  const { paragraphPos, paragraphSize, cursorPos } = context;

  return editor
    .chain()
    .command(({ tr, dispatch }) => {
      if (!dispatch) {
        return true;
      }

      tr.delete(paragraphPos, paragraphPos + paragraphSize);
      tr.setSelection(TextSelection.near(tr.doc.resolve(cursorPos), -1));
      return true;
    })
    .run();
}

/**
 * Tiptap ListKeymap은 리스트 직후 빈 문단에서 Backspace 시 문단을 지우지 않고
 * 리스트에 새 항목을 붙인다. Notion-style UX를 위해 빈 문단만 제거한다.
 */
export const ListBackspaceFix = Extension.create({
  name: "listBackspaceFix",
  priority: 200,

  addKeyboardShortcuts() {
    const handleBackspace = () => deleteEmptyParagraphAfterList(this.editor);

    return {
      Backspace: handleBackspace,
      "Mod-Backspace": handleBackspace,
    };
  },
});
