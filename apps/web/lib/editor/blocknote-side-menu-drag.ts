import {
  getBlockInfoFromSelection,
  type BlockNoteEditor,
} from "@blocknote/core";

type DragSession = {
  blockId: string;
  editor: BlockNoteEditor;
};

function getBlockContainerIdFromElement(
  view: BlockNoteEditor["prosemirrorView"],
  element: Element,
): string | undefined {
  let current: Element | null = element;
  while (current && current !== view.dom) {
    if (current.getAttribute?.("data-node-type") === "blockContainer") {
      return current.getAttribute("data-id") ?? undefined;
    }
    current = current.parentElement;
  }
  return undefined;
}

function getBlockContentRowRect(container: HTMLElement): DOMRect | undefined {
  const content = container.querySelector(
    "[data-content-type], .bn-block-content",
  ) as HTMLElement | null;
  return (content ?? container).getBoundingClientRect();
}

function getBlockIdForRowY(
  view: BlockNoteEditor["prosemirrorView"],
  rowY: number,
): string | undefined {
  const containers = view.dom.querySelectorAll<HTMLElement>(
    '[data-node-type="blockContainer"][data-id]',
  );

  let matchedId: string | undefined;
  let matchedIndent = -1;

  for (const container of containers) {
    const rowRect = getBlockContentRowRect(container);
    if (!rowRect) {
      continue;
    }

    if (rowY < rowRect.top - 1 || rowY > rowRect.bottom + 1) {
      continue;
    }

    const indent = rowRect.left;
    if (indent >= matchedIndent) {
      matchedIndent = indent;
      matchedId = container.getAttribute("data-id") ?? undefined;
    }
  }

  return matchedId;
}

function getBlockIdForSideMenuRow(
  view: BlockNoteEditor["prosemirrorView"],
): string | undefined {
  const sideMenu = view.root.querySelector(".bn-side-menu");
  if (!sideMenu) {
    return undefined;
  }

  const menuRect = sideMenu.getBoundingClientRect();
  return getBlockIdForRowY(view, menuRect.top + menuRect.height / 2);
}

function isDescendantBlock(
  editor: BlockNoteEditor,
  ancestorId: string,
  blockId: string,
): boolean {
  let block = editor.getBlock(blockId);
  while (block) {
    const parent = editor.getParentBlock(block);
    if (!parent) {
      return false;
    }
    if (parent.id === ancestorId) {
      return true;
    }
    block = parent;
  }
  return false;
}

function captureDragSession(
  editor: BlockNoteEditor,
  lockedBlockId: string | null,
): DragSession | null {
  if (lockedBlockId && editor.getBlock(lockedBlockId)) {
    return { blockId: lockedBlockId, editor };
  }

  const view = editor.prosemirrorView;
  if (!("node" in view.state.selection)) {
    return null;
  }

  try {
    const blockInfo = getBlockInfoFromSelection(view.state);
    if (!blockInfo.isBlockContainer) {
      return null;
    }

    const blockId = blockInfo.bnBlock.node.attrs.id as string | undefined;
    if (!blockId) {
      return null;
    }

    return { blockId, editor };
  } catch {
    return null;
  }
}

/**
 * BlockNote side-menu drags serialize blocks to HTML but ProseMirror drop does not
 * remove the source subtree reliably. Handle same-editor moves with remove+insert.
 *
 * Nested list items: pointer hit-testing inside a parent block's bounding box can
 * resolve to a child row. Lock the dragged block from the side-menu row or the
 * block-content row under the pointer.
 */
export function attachBlockNoteSideMenuDragFix(
  editor: BlockNoteEditor,
): () => void {
  const view = editor.prosemirrorView;
  let dragSession: DragSession | null = null;
  let lockedBlockId: string | null = null;

  const lockBlockFromPointer = (target: Element, clientY: number) => {
    if (
      target.closest('[data-test="dragHandle"]') ||
      target.closest(".bn-side-menu")
    ) {
      const sideMenuBlockId = getBlockIdForSideMenuRow(view);
      if (sideMenuBlockId) {
        lockedBlockId = sideMenuBlockId;
      }
      return;
    }

    const rowBlockId = getBlockIdForRowY(view, clientY);
    if (rowBlockId) {
      lockedBlockId = rowBlockId;
    }
  };

  const onPointerMove = (event: PointerEvent | MouseEvent) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    if (
      !event.target.closest(
        "[data-content-type], .bn-block-content, .bn-side-menu, [data-test=\"dragHandle\"]",
      )
    ) {
      return;
    }

    lockBlockFromPointer(event.target, event.clientY);
  };

  const onPointerDown = (event: PointerEvent | MouseEvent) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    lockBlockFromPointer(event.target, event.clientY);
  };

  const onDragStart = (event: DragEvent) => {
    if (event.target instanceof Element) {
      lockBlockFromPointer(event.target, event.clientY);
    }

    const session = captureDragSession(editor, lockedBlockId);
    if (session) {
      dragSession = session;
      return;
    }

    queueMicrotask(() => {
      const deferred = captureDragSession(editor, lockedBlockId);
      if (deferred) {
        dragSession = deferred;
      }
    });
  };

  const onDrop = (event: DragEvent) => {
    if ((event as DragEvent & { synthetic?: boolean }).synthetic) {
      return;
    }

    if (!dragSession || dragSession.editor !== editor) {
      return;
    }

    if (!event.dataTransfer?.types.includes("blocknote/html")) {
      return;
    }

    if (!(event.target instanceof Node) || !view.dom.contains(event.target)) {
      return;
    }

    const draggedBlockId =
      lockedBlockId && editor.getBlock(lockedBlockId)
        ? lockedBlockId
        : dragSession.blockId;
    const dragged = editor.getBlock(draggedBlockId);
    if (!dragged) {
      dragSession = null;
      return;
    }

    const elements = view.root.elementsFromPoint(event.clientX, event.clientY);
    let dropBlockId: string | undefined;
    let dropElement: HTMLElement | undefined;

    for (const element of elements) {
      if (!view.dom.contains(element)) {
        continue;
      }

      const blockId = getBlockContainerIdFromElement(view, element);
      if (blockId) {
        dropBlockId = blockId;
        dropElement = element as HTMLElement;
        break;
      }
    }

    const dropBlock = dropBlockId ? editor.getBlock(dropBlockId) : undefined;
    if (
      !dropBlock ||
      dropBlock.id === dragged.id ||
      isDescendantBlock(editor, dragged.id, dropBlock.id)
    ) {
      dragSession = null;
      return;
    }

    const dropRect = dropElement?.getBoundingClientRect();
    const placement =
      dropRect && event.clientY > dropRect.top + dropRect.height / 2
        ? "after"
        : "before";

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    view.dragging = null;
    const referenceBlockId = dropBlock.id;

    editor.transact(() => {
      const blockSnapshot = structuredClone(editor.getBlock(draggedBlockId));
      if (!blockSnapshot) {
        return;
      }

      editor.removeBlocks([draggedBlockId]);
      const referenceBlock = editor.getBlock(referenceBlockId);
      if (!referenceBlock) {
        return;
      }

      editor.insertBlocks([blockSnapshot], referenceBlock, placement);
    });

    (window as Window & { __ssotaDragDropHandled?: boolean }).__ssotaDragDropHandled =
      true;
    dragSession = null;
    lockedBlockId = null;
  };

  const onDragEnd = () => {
    dragSession = null;
    lockedBlockId = null;
    view.dragging = null;
  };

  const onDropListener: EventListener = (event) => {
    onDrop(event as DragEvent);
  };

  const onPointerMoveListener: EventListener = (event) => {
    onPointerMove(event as PointerEvent | MouseEvent);
  };

  const onPointerDownListener: EventListener = (event) => {
    onPointerDown(event as PointerEvent | MouseEvent);
  };

  const onDragStartListener: EventListener = (event) => {
    onDragStart(event as DragEvent);
  };

  view.root.addEventListener("pointermove", onPointerMoveListener, true);
  view.root.addEventListener("mousemove", onPointerMoveListener, true);
  view.root.addEventListener("pointerdown", onPointerDownListener, true);
  window.addEventListener("pointerdown", onPointerDownListener, true);
  view.root.addEventListener("dragstart", onDragStartListener, true);
  window.addEventListener("dragstart", onDragStartListener, true);
  window.addEventListener("drop", onDropListener, true);
  view.root.addEventListener("dragend", onDragEnd, true);

  return () => {
    view.root.removeEventListener("pointermove", onPointerMoveListener, true);
    view.root.removeEventListener("mousemove", onPointerMoveListener, true);
    view.root.removeEventListener("pointerdown", onPointerDownListener, true);
    window.removeEventListener("pointerdown", onPointerDownListener, true);
    view.root.removeEventListener("dragstart", onDragStartListener, true);
    window.removeEventListener("dragstart", onDragStartListener, true);
    window.removeEventListener("drop", onDropListener, true);
    view.root.removeEventListener("dragend", onDragEnd, true);
  };
}
