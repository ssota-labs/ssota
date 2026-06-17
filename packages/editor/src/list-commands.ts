import type { Editor } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { ResolvedPos } from "@tiptap/pm/model";
import { Fragment, Slice } from "@tiptap/pm/model";
import { TextSelection, type Transaction } from "@tiptap/pm/state";
import { stripListMarkerText } from "./list-marker-utils";

export type EditorListType = "bulletList" | "orderedList";

type ListNodeMatch = {
  type: EditorListType;
  pos: number;
  depth: number;
};

function cloneListNode(node: ProseMirrorNode): ProseMirrorNode {
  return node.type.schema.nodeFromJSON(node.toJSON());
}

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

export function findListItemIndexInList(
  $from: ResolvedPos,
  listDepth: number,
): number | null {
  const listItemDepth = findListItemDepth($from);
  if (listItemDepth === null || listItemDepth <= listDepth) {
    return null;
  }

  const listStart = $from.before(listDepth);
  const listItemStart = $from.before(listItemDepth);
  const listNode = $from.node(listDepth);
  let pos = listStart + 1;

  for (let index = 0; index < listNode.childCount; index += 1) {
    if (pos === listItemStart) {
      return index;
    }
    pos += listNode.child(index).nodeSize;
  }

  return null;
}

function listItemHasNestedList(listItem: ProseMirrorNode): boolean {
  return listItem.content.content.some((child) =>
    isEditorListType(child.type.name),
  );
}

/** 현재 텍스트 블록 맨 앞의 `- ` / `1. ` 마커를 제거한다. */
function stripListMarkerFromCurrentBlock(editor: Editor): boolean {
  const { state } = editor;
  const $from = state.selection.$from;
  const parent = $from.parent;

  if (!parent.isTextblock || parent.type.spec.code) {
    return false;
  }

  const text = parent.textContent;
  const stripped = stripListMarkerText(text);
  if (stripped === text) {
    return false;
  }

  const blockStart = $from.start();
  const prefixLength = text.length - stripped.length;

  return editor
    .chain()
    .focus()
    .command(({ tr, dispatch }) => {
      if (!dispatch) {
        return true;
      }

      tr.delete(blockStart, blockStart + prefixLength);
      const nextPos = Math.max(
        blockStart + 1,
        Math.min(state.selection.from - prefixLength, tr.doc.content.size - 1),
      );
      tr.setSelection(TextSelection.near(tr.doc.resolve(nextPos)));
      return true;
    })
    .run();
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
  const paragraph = listItem.firstChild;
  if (!paragraph || paragraph.type.name !== "paragraph") {
    return false;
  }

  stripListMarkerFromCurrentBlock(editor);
  const refreshedFrom = editor.state.selection.$from;
  const refreshedListItem = refreshedFrom.node(listItemDepth);
  const refreshedParagraph = refreshedListItem.firstChild;
  if (!refreshedParagraph || refreshedParagraph.type.name !== "paragraph") {
    return false;
  }
  const refreshedListItemPos = refreshedFrom.before(listItemDepth);

  return editor
    .chain()
    .focus()
    .command(({ tr, dispatch }) => {
      if (!dispatch) return true;

      const currentListItem = tr.doc.nodeAt(refreshedListItemPos);
      if (!currentListItem || currentListItem.type.name !== "listItem") {
        return false;
      }

      const paragraphStart = refreshedListItemPos + 1;
      const paragraphEnd = paragraphStart + refreshedParagraph.nodeSize;
      const nestedListItem = listItemType.create(null, [refreshedParagraph]);
      const nestedList = targetType.create(null, nestedListItem);

      tr.replaceWith(paragraphStart, paragraphEnd, nestedList);
      tr.setSelection(TextSelection.near(tr.doc.resolve(paragraphStart + 2)));
      return true;
    })
    .run();
}

function isListNestedInListItem(
  $from: ResolvedPos,
  innermost: ListNodeMatch,
): boolean {
  const parentDepth = innermost.depth - 1;
  if (parentDepth <= 0) {
    return false;
  }
  return $from.node(parentDepth).type.name === "listItem";
}

function orderedListAttrs(
  start: number,
  baseAttrs: Record<string, unknown>,
): Record<string, unknown> {
  return { ...baseAttrs, start };
}

/**
 * 리스트 타입 전환.
 * - 상위 listItem 아래 중첩 리스트: 현재 listItem만 반대 타입 형제 리스트로 분리
 * - 최상위 리스트: list 노드 전체 타입 변환
 */
export function applyListItemTypeConversion(
  tr: Transaction,
  $from: ResolvedPos,
  targetListType: EditorListType,
  orderedStart?: number,
): boolean {
  const innermost = findInnermostList($from);
  if (!innermost || innermost.type === targetListType) {
    return false;
  }

  const listDepth = innermost.depth;
  const listNode = $from.node(listDepth);
  const listStart = $from.before(listDepth);
  const listEnd = listStart + listNode.nodeSize;
  const itemIndex = findListItemIndexInList($from, listDepth);
  if (itemIndex === null) {
    return false;
  }
  const sourceItem = listNode.child(itemIndex);
  const currentListItem = cloneListNode(sourceItem);
  const listChildren: ProseMirrorNode[] = [];
  listNode.forEach((child) => {
    listChildren.push(child);
  });
  const beforeItems = Fragment.from(
    listChildren.slice(0, itemIndex).map((child) => cloneListNode(child)),
  );
  const afterItems = Fragment.from(
    listChildren.slice(itemIndex + 1).map((child) => cloneListNode(child)),
  );

  const sourceListType = tr.doc.type.schema.nodes[innermost.type];
  const targetListTypeNode = tr.doc.type.schema.nodes[targetListType];
  if (!sourceListType || !targetListTypeNode) {
    return false;
  }

  if (!isListNestedInListItem($from, innermost)) {
    const attrs =
      targetListType === "orderedList"
        ? orderedListAttrs(
            orderedStart ?? (listNode.attrs.start as number | undefined) ?? 1,
            listNode.attrs,
          )
        : listNode.attrs;
    tr.setNodeMarkup(listStart, targetListTypeNode, attrs, listNode.marks);
    tr.setSelection(
      TextSelection.near(
        tr.doc.resolve(Math.min(tr.mapping.map($from.pos), tr.doc.content.size - 1)),
      ),
    );
    return true;
  }

  const fragments: ProseMirrorNode[] = [];
  const baseStart = (listNode.attrs.start as number | undefined) ?? 1;

  if (beforeItems.childCount > 0) {
    fragments.push(sourceListType.create(listNode.attrs, beforeItems));
  }

  const convertedAttrs =
    targetListType === "orderedList"
      ? orderedListAttrs(orderedStart ?? baseStart + itemIndex, {})
      : undefined;
  fragments.push(targetListTypeNode.create(convertedAttrs, currentListItem));

  if (afterItems.childCount > 0) {
    fragments.push(
      sourceListType.create(
        orderedListAttrs(baseStart + itemIndex + 1, listNode.attrs),
        afterItems,
      ),
    );
  }

  const mappedListStart = tr.mapping.map(listStart);
  const mappedListEnd = tr.mapping.map(listEnd);
  tr.replace(
    mappedListStart,
    mappedListEnd,
    new Slice(Fragment.from(fragments), 0, 0),
  );

  const convertedIndex = beforeItems.childCount > 0 ? 1 : 0;
  let selectionPos = mappedListStart;
  for (let i = 0; i < convertedIndex; i += 1) {
    selectionPos += fragments[i]!.nodeSize;
  }
  tr.setSelection(
    TextSelection.near(
      tr.doc.resolve(Math.min(selectionPos + 2, tr.doc.content.size - 1)),
    ),
  );

  return true;
}

/** listItem 아래 중첩 리스트에서 현재 항목만 반대 타입 형제 리스트로 분리한다. */
export function convertListItemToSiblingListType(
  editor: Editor,
  listType: EditorListType,
  orderedStart?: number,
): boolean {
  const { state } = editor;
  const innermost = findInnermostList(state.selection.$from);
  if (!innermost || !isListNestedInListItem(editor.state.selection.$from, innermost)) {
    return convertInnermostListType(editor, listType, orderedStart);
  }

  return editor
    .chain()
    .focus()
    .command(({ tr, dispatch }) => {
      if (!dispatch) {
        return true;
      }
      return applyListItemTypeConversion(
        tr,
        editor.state.selection.$from,
        listType,
        orderedStart,
      );
    })
    .run();
}

/** 가장 안쪽 list 노드 타입만 bullet ↔ numbered로 전환한다. */
export function convertInnermostListType(
  editor: Editor,
  listType: EditorListType,
  orderedStart?: number,
): boolean {
  const { state } = editor;
  const innermost = findInnermostList(state.selection.$from);
  if (!innermost) {
    return false;
  }

  if (innermost.type === listType) {
    return true;
  }

  const currentNode = state.doc.nodeAt(innermost.pos);
  const targetType = state.schema.nodes[listType];
  if (!currentNode || !targetType) {
    return false;
  }

  const attrs =
    listType === "orderedList"
      ? {
          ...currentNode.attrs,
          start: orderedStart ?? currentNode.attrs.start ?? 1,
        }
      : currentNode.attrs;

  return editor
    .chain()
    .focus()
    .command(({ tr, dispatch }) => {
      if (dispatch) {
        tr.setNodeMarkup(innermost.pos, targetType, attrs, currentNode.marks);
      }
      return true;
    })
    .run();
}

/**
 * Notion처럼 현재 들여쓰기 레벨의 list 타입만 전환한다.
 * - 리스트 밖: 새 리스트 생성/해제
 * - listItem 아래 중첩 리스트: 현재 listItem만 반대 타입 형제 리스트로 분리
 * - 최상위 리스트: 두 번째 이후 항목은 이전 항목 아래 중첩, 첫 항목은 nest
 */
export function applyListType(
  editor: Editor,
  listType: EditorListType,
  orderedStart?: number,
): boolean {
  stripListMarkerFromCurrentBlock(editor);

  const { state } = editor;
  const $from = state.selection.$from;
  const innermost = findInnermostList($from);

  if (!innermost) {
    return editor.chain().focus().toggleList(listType, "listItem").run();
  }

  if (innermost.type === listType) {
    return editor.chain().focus().toggleList(listType, "listItem").run();
  }

  if (isListNestedInListItem($from, innermost)) {
    return convertListItemToSiblingListType(editor, listType, orderedStart);
  }

  const targetType = state.schema.nodes[listType];
  if (!targetType) {
    return false;
  }

  const listItemDepth = findListItemDepth($from);
  if (listItemDepth !== null) {
    const listItem = $from.node(listItemDepth);
    const parentList = $from.node(listItemDepth - 1);
    const listItemIndex = $from.index(listItemDepth - 1);

    if (!listItemHasNestedList(listItem)) {
      if (parentList.childCount === 1) {
        return convertInnermostListType(editor, listType, orderedStart);
      }

      if (listItemIndex > 0) {
        const sunk = editor.chain().focus().sinkListItem("listItem").run();
        if (sunk) {
          return applyListType(editor, listType, orderedStart);
        }
      }

      return nestOppositeListType(editor, listType, $from, listItemDepth);
    }

    if (listItemIndex === 0 && parentList.childCount > 1) {
      return nestOppositeListType(editor, listType, $from, listItemDepth);
    }
  }

  const topLevelItemIndex = findListItemIndexInList($from, innermost.depth);
  const topLevelList = $from.node(innermost.depth);
  if (
    !isListNestedInListItem($from, innermost) &&
    topLevelList.childCount > 1 &&
    topLevelItemIndex !== null &&
    topLevelItemIndex > 0
  ) {
    const sunk = editor.chain().focus().sinkListItem("listItem").run();
    if (sunk) {
      return applyListType(editor, listType, orderedStart);
    }

    if (listItemDepth !== null) {
      return nestOppositeListType(editor, listType, $from, listItemDepth);
    }
  }

  return convertInnermostListType(editor, listType, orderedStart);
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
