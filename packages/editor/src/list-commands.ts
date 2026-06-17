import type { Editor } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { ResolvedPos } from "@tiptap/pm/model";
import { TextSelection } from "@tiptap/pm/state";

export type EditorListType = "bulletList" | "orderedList";

type ListNodeMatch = {
  type: EditorListType;
  pos: number;
  depth: number;
};

function isEditorListType(name: string): name is EditorListType {
  return name === "bulletList" || name === "orderedList";
}

/** 현재 커서가 속한 가장 안쪽 bullet/numbered list */
export function findInnermostList($from: ResolvedPos): ListNodeMatch | null {
  let match: ListNodeMatch | null = null;

  for (let depth = 1; depth <= $from.depth; depth += 1) {
    const node = $from.node(depth);
    if (isEditorListType(node.type.name)) {
      match = {
        type: node.type.name,
        pos: $from.before(depth),
        depth,
      };
    }
  }

  return match;
}

/** 현재 커서가 속한 가장 안쪽 list 타입 (혼합 중첩 시 isActive 대신 사용) */
export function getActiveListType(editor: Editor): EditorListType | null {
  return findInnermostList(editor.state.selection.$from)?.type ?? null;
}

function findListItemDepth($from: ResolvedPos): number | null {
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name === "listItem") {
      return depth;
    }
  }
  return null;
}

function listItemHasNestedList(listItem: ProseMirrorNode): boolean {
  return listItem.content.content.some((child) =>
    isEditorListType(child.type.name),
  );
}

function nestOppositeListType(
  editor: Editor,
  listType: EditorListType,
  $from: ResolvedPos,
  listItemDepth: number,
): boolean {
  const { state } = editor;
  const targetType = state.schema.nodes[listType];
  const listItemType = state.schema.nodes.listItem;
  if (!targetType || !listItemType) {
    return false;
  }

  const listItem = $from.node(listItemDepth);
  const listItemPos = $from.before(listItemDepth);
  const paragraph = listItem.firstChild;
  if (!paragraph || paragraph.type.name !== "paragraph") {
    return false;
  }

  return editor
    .chain()
    .focus()
    .command(({ tr, dispatch }) => {
      if (!dispatch) return true;

      const currentListItem = tr.doc.nodeAt(listItemPos);
      if (!currentListItem || currentListItem.type.name !== "listItem") {
        return false;
      }

      const paragraphStart = listItemPos + 1;
      const paragraphEnd = paragraphStart + paragraph.nodeSize;
      const nestedListItem = listItemType.create(null, [paragraph]);
      const nestedList = targetType.create(null, nestedListItem);

      tr.replaceWith(paragraphStart, paragraphEnd, nestedList);
      tr.setSelection(TextSelection.near(tr.doc.resolve(paragraphStart + 2)));
      return true;
    })
    .run();
}

/**
 * Notion처럼 현재 들여쓰기 레벨의 list 타입만 전환한다.
 * - 리스트 밖: 새 리스트 생성/해제
 * - 리스트 안, 다른 타입: 가장 안쪽 list 노드만 bullet ↔ numbered 전환
 * - 리스트 아이템 안에 하위 리스트가 없으면: 현재 줄을 반대 타입 하위 리스트로 중첩
 */
export function applyListType(editor: Editor, listType: EditorListType): boolean {
  const { state } = editor;
  const $from = state.selection.$from;
  const innermost = findInnermostList($from);

  if (!innermost) {
    return editor.chain().focus().toggleList(listType, "listItem").run();
  }

  if (innermost.type === listType) {
    return editor.chain().focus().toggleList(listType, "listItem").run();
  }

  const targetType = state.schema.nodes[listType];
  if (!targetType) {
    return false;
  }

  const listItemDepth = findListItemDepth($from);
  if (listItemDepth !== null) {
    const listItem = $from.node(listItemDepth);
    if (!listItemHasNestedList(listItem)) {
      const listItemIndex = $from.index(listItemDepth - 1);
      if (listItemIndex > 0) {
        const sunk = editor.chain().focus().sinkListItem("listItem").run();
        if (sunk) {
          return applyListType(editor, listType);
        }
      }
      return nestOppositeListType(editor, listType, $from, listItemDepth);
    }
  }

  const currentNode = state.doc.nodeAt(innermost.pos);
  if (!currentNode) {
    return false;
  }

  return editor
    .chain()
    .focus()
    .command(({ tr, dispatch }) => {
      if (dispatch) {
        tr.setNodeMarkup(innermost.pos, targetType, currentNode.attrs, currentNode.marks);
      }
      return true;
    })
    .run();
}

/** ordered 안에 bullet, bullet 안에 ordered 등 혼합 중첩이 있는지 검사 */
export function hasMixedListNesting(doc: Editor["state"]["doc"]): boolean {
  let mixed = false;

  const visit = (node: ProseMirrorNode, enclosingList: EditorListType | null) => {
    if (mixed || !node) return;

    if (isEditorListType(node.type.name)) {
      if (enclosingList && enclosingList !== node.type.name) {
        mixed = true;
        return;
      }

      const listType = node.type.name;
      node.forEach((listItem) => {
        listItem.forEach((child) => visit(child, listType));
      });
      return;
    }

    node.forEach((child) => visit(child, enclosingList));
  };

  doc.forEach((child) => visit(child, null));
  return mixed;
}
