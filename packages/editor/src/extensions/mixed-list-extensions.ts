import { BulletList, OrderedList } from "@tiptap/extension-list";
import { applyListType } from "../list-commands";

/** Notion-style: 현재 들여쓰기 레벨만 bullet ↔ numbered 전환 */
export const MixedBulletList = BulletList.extend({
  addInputRules() {
    return [];
  },

  addCommands() {
    return {
      ...this.parent?.(),
      toggleBulletList:
        () =>
        ({ editor }) =>
          applyListType(editor, "bulletList"),
    };
  },
});

export const MixedOrderedList = OrderedList.extend({
  addInputRules() {
    return [];
  },

  addCommands() {
    return {
      ...this.parent?.(),
      toggleOrderedList:
        () =>
        ({ editor }) =>
          applyListType(editor, "orderedList"),
    };
  },
});
