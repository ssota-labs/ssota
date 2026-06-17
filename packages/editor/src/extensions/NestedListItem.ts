import { ListItem } from "@tiptap/extension-list";

/** bullet ↔ numbered 상호 중첩을 명시적으로 허용 */
export const NestedListItem = ListItem.extend({
  content: "paragraph (bulletList | orderedList)*",
});
