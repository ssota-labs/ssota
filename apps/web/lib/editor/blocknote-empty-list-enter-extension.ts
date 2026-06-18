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

  const { blockContent, bnBlock } = blockInfo;
  if (!LIST_ITEM_TYPES.has(blockInfo.blockNoteType)) {
    return false;
  }

  if (blockContent.node.childCount !== 0) {
    return false;
  }

  const depth = state.doc.resolve(bnBlock.beforePos).depth;
  const blockIndented = depth > 1;
  if (blockIndented) {
    return false;
  }

  const cursor = editor.getTextCursorPosition();
  if (!LIST_ITEM_TYPES.has(cursor.block.type)) {
    return false;
  }

  const listType = cursor.block.type as
    | "bulletListItem"
    | "numberedListItem"
    | "checkListItem"
    | "toggleListItem";

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

/** Keep empty top-level list items in the list when pressing Enter. */
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
