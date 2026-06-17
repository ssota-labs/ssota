import type { Editor } from "@tiptap/react";

export type ListItemType = "listItem" | "taskItem";

export function activeListItemType(editor: Editor): ListItemType | null {
  if (editor.isActive("taskItem")) return "taskItem";
  if (editor.isActive("listItem")) return "listItem";
  return null;
}

/**
 * 리스트 Tab/Shift+Tab 및 반복 내어쓰기 후 포커스 이탈 방지.
 * ProseMirror `handleKeyDown`에서 `preventDefault`로 브라우저 역탭 이동을 막는다.
 */
export function handleListTabKeyDown(
  editor: Editor,
  event: KeyboardEvent,
): boolean {
  if (event.key !== "Tab") return false;
  if (event.altKey || event.ctrlKey || event.metaKey) return false;
  if (!editor.isFocused) return false;

  const itemType = activeListItemType(editor);

  if (itemType) {
    event.preventDefault();
    if (event.shiftKey) {
      editor.commands.liftListItem(itemType);
    } else {
      editor.commands.sinkListItem(itemType);
    }
    return true;
  }

  // 리스트에서 완전히 내어쓴 뒤에도 Shift+Tab이 에디터 밖으로 포커스를 빼지 않게 한다.
  if (event.shiftKey) {
    event.preventDefault();
    return true;
  }

  return false;
}
