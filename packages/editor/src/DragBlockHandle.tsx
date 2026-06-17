"use client";

import { DragHandle } from "@tiptap/extension-drag-handle-react";
import type { Editor } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import {
  DotsSixVerticalIcon,
  PlusIcon,
  TextHOneIcon,
  TextHTwoIcon,
  TextTIcon,
  TrashIcon,
  CopyIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@ssota/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@ssota/ui/components/ui/dropdown-menu";

type ActiveNode = {
  node: ProseMirrorNode;
  pos: number;
} | null;

export function DragBlockHandle({
  editor,
  onDragActiveChange,
}: {
  editor: Editor;
  onDragActiveChange?: (active: boolean) => void;
}) {
  const [activeNode, setActiveNode] = useState<ActiveNode>(null);

  function insertParagraphAfter() {
    if (!activeNode) return;
    editor
      .chain()
      .focus()
      .insertContentAt(activeNode.pos + activeNode.node.nodeSize, {
        type: "paragraph",
      })
      .run();
  }

  function duplicateNode() {
    if (!activeNode) return;
    editor
      .chain()
      .focus()
      .insertContentAt(
        activeNode.pos + activeNode.node.nodeSize,
        activeNode.node.toJSON(),
      )
      .run();
  }

  function deleteNode() {
    if (!activeNode) return;
    editor
      .chain()
      .focus()
      .deleteRange({
        from: activeNode.pos,
        to: activeNode.pos + activeNode.node.nodeSize,
      })
      .run();
  }

  function convertToParagraph() {
    if (!activeNode) return;
    editor
      .chain()
      .focus()
      .setNodeSelection(activeNode.pos)
      .setNode("paragraph")
      .run();
  }

  function convertToHeading(level: 1 | 2) {
    if (!activeNode) return;
    editor
      .chain()
      .focus()
      .setNodeSelection(activeNode.pos)
      .setNode("heading", { level })
      .run();
  }

  return (
    <DragHandle
      editor={editor}
      nested
      className="ssota-drag-handle"
      onElementDragStart={() => onDragActiveChange?.(true)}
      onElementDragEnd={() => onDragActiveChange?.(false)}
      onNodeChange={({ node, pos }) => {
        setActiveNode(node ? { node, pos } : null);
      }}
    >
      <div
        className="ssota-drag-handle-inner"
        onMouseDown={(event) => event.preventDefault()}
      >
        <span
          className="ssota-drag-grip"
          title="Drag block"
          aria-label="Drag block"
        >
          <DotsSixVerticalIcon className="size-4" />
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          title="Add block below"
          aria-label="Add block below"
          className="ssota-drag-handle-button"
          onClick={insertParagraphAfter}
        >
          <PlusIcon className="size-3.5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="ssota-drag-handle-trigger"
            title="Block actions"
            aria-label="Block actions"
          >
            <DotsSixVerticalIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" className="w-44">
            <DropdownMenuItem onClick={convertToParagraph}>
              <TextTIcon className="size-4" />
              Paragraph
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => convertToHeading(1)}>
              <TextHOneIcon className="size-4" />
              Heading 1
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => convertToHeading(2)}>
              <TextHTwoIcon className="size-4" />
              Heading 2
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={duplicateNode}>
              <CopyIcon className="size-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={deleteNode}>
              <TrashIcon className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </DragHandle>
  );
}
