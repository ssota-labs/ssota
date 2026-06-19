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

function handleEmptyListItemEnter(editor: BlockNoteEditor): boolean {
  const state = editor.prosemirrorState;
  const selectionEmpty = state.selection.anchor === state.selection.head;
  if (!selectionEmpty) {
    return false;
  }

  const blockInfo = getBlockInfoFromSelection(state);
  if (!blockInfo.isBlockContainer) {
    return false;
  }

  const { blockContent } = blockInfo;
  if (!LIST_ITEM_TYPES.has(blockInfo.blockNoteType)) {
    return false;
  }

  if (!isEmptyListBlockContent(blockContent)) {
    return false;
  }

  const cursor = editor.getTextCursorPosition();
  if (!LIST_ITEM_TYPES.has(cursor.block.type)) {
    return false;
  }

  const listType = cursor.block.type as ListItemType;
  const inserted = editor.insertBlocks(
    [{ type: listType, content: "" }],
    cursor.block,
    "after",
  );
  const newBlock = inserted[0];
  if (!newBlock) {
    return false;
  }

  editor.setTextCursorPosition(newBlock.id, "start");
  return true;
}

/** Keep empty list items in the list when pressing Enter at any depth. */
export const blockNoteEmptyListEnterExtension = createExtension({
  key: "ssota-empty-list-enter",
  runsBefore: [
    "bullet-list-item-shortcuts",
    "numbered-list-item-shortcuts",
    "check-list-item-shortcuts",
    "toggle-list-item-shortcuts",
  ],
  keyboardShortcuts: {
    Enter: ({ editor }) => handleEmptyListItemEnter(editor),
  },
});
