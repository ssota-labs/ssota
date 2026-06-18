import { ListItem } from "@tiptap/extension-list";

/**
 * Notion-style list item: bullet ↔ numbered 상호 중첩.
 * Tab/Shift-Tab은 `SsotaEditor`의 `handleKeyDown`에서 처리한다.
 */
export const NestedListItem = ListItem.extend({
  content: "paragraph (bulletList | orderedList)*",

  addKeyboardShortcuts() {
    const parent = this.parent?.() ?? {};
    const { Tab: _tab, "Shift-Tab": _shiftTab, ...rest } = parent;
    return {
      ...rest,
      Enter: () => this.editor.commands.splitListItem(this.name),
    };
  },
});
