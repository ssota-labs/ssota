import {
  createExtension,
  getBlockInfoFromSelection,
  type BlockNoteEditor,
} from "@blocknote/core";

const LIST_ITEM_TYPES = new Set([
  "bulletListItem",
  "numberedListItem",
  "checkListItem",
  "toggleListItem",
]);

type ListItemType =
  | "bulletListItem"
  | "numberedListItem"
  | "checkListItem"
  | "toggleListItem";

function isEmptyListBlockContent(
  blockContent: { node: { childCount: number; textContent: string } },
): boolean {
  if (blockContent.node.childCount === 0) {
    return true;
  }

  return blockContent.node.textContent.trim().length === 0;
}

function isCursorAtEndOfBlockContent(
  state: BlockNoteEditor["prosemirrorState"],
  blockContent: { beforePos: number; afterPos: number },
): boolean {
  if (state.selection.anchor !== state.selection.head) {
    return false;
  }

  const pos = state.selection.head;
  return pos === blockContent.afterPos - 1;
}

function insertSiblingListItem(
  editor: BlockNoteEditor,
  listType: ListItemType,
  referenceBlockId: string,
): boolean {
  const inserted = editor.insertBlocks(
    [{ type: listType, content: "" }],
    referenceBlockId,
    "after",
  );
  const newBlock = inserted[0];
  if (!newBlock) {
    return false;
  }

  editor.setTextCursorPosition(newBlock.id, "start");
  return true;
}

function handleListItemEnter(editor: BlockNoteEditor): boolean {
  const state = editor.prosemirrorState;
  const selectionEmpty = state.selection.anchor === state.selection.head;
  if (!selectionEmpty) {
    return false;
  }

  const blockInfo = getBlockInfoFromSelection(state);
  if (!blockInfo.isBlockContainer) {
    return false;
  }

  const { blockContent, bnBlock } = blockInfo;
  if (!LIST_ITEM_TYPES.has(blockInfo.blockNoteType)) {
    return false;
  }

  const blockId = bnBlock.node.attrs.id as string | undefined;
  if (!blockId) {
    return false;
  }

  const cursor = editor.getTextCursorPosition();
  if (!LIST_ITEM_TYPES.has(cursor.block.type)) {
    return false;
  }

  const listType = cursor.block.type as ListItemType;

  if (isEmptyListBlockContent(blockContent)) {
    return insertSiblingListItem(editor, listType, blockId);
  }

  const block = editor.getBlock(blockId);
  if (!block?.children.length) {
    return false;
  }

  if (!isCursorAtEndOfBlockContent(state, blockContent)) {
    return false;
  }

  // BlockNote's splitBlock no-ops when the cursor is at the end of a list item
  // that already has nested children. Insert a sibling after the whole subtree.
  return insertSiblingListItem(editor, listType, blockId);
}

/** Fix Enter no-ops on empty list items and list parents with nested children. */
export const blockNoteEmptyListEnterExtension = createExtension({
  key: "ssota-empty-list-enter",
  runsBefore: [
    "bullet-list-item-shortcuts",
    "numbered-list-item-shortcuts",
    "check-list-item-shortcuts",
    "toggle-list-item-shortcuts",
  ],
  keyboardShortcuts: {
    Enter: ({ editor }) => handleListItemEnter(editor),
  },
});
