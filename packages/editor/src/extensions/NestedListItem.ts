import { ListItem } from "@tiptap/extension-list";

/**
 * Notion-style list item: bullet ↔ numbered 상호 중첩.
 * Tab/Shift-Tab은 `sinkListItem` / `liftListItem` (ProseMirror schema-list)을 사용한다.
 * sink가 실패해도 리스트 안에서는 true를 반환해 브라우저 Tab 포커스 이동을 막는다.
 * @see https://tiptap.dev/docs/editor/extensions/nodes/list-item
 * @see https://github.com/ueberdosis/tiptap/issues/3018
 */
export const NestedListItem = ListItem.extend({
  content: "paragraph (bulletList | orderedList)*",

  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      Tab: () => {
        if (this.editor.commands.sinkListItem(this.name)) {
          return true;
        }
        return this.editor.isActive(this.name);
      },
      "Shift-Tab": () => {
        if (this.editor.commands.liftListItem(this.name)) {
          return true;
        }
        return this.editor.isActive(this.name);
      },
    };
  },
});
