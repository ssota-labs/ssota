"use client";

import type { Editor } from "@tiptap/react";
import { isNodeRangeSelection } from "@tiptap/extension-node-range";
import { BubbleMenu } from "@tiptap/react/menus";
import {
  CodeIcon,
  HighlighterCircleIcon,
  ListBulletsIcon,
  ListNumbersIcon,
  MinusIcon,
  RowsIcon,
  TextAaIcon,
  TextBIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ssota/ui/components/ui/tooltip";
import { ColorPopover } from "./ColorPopover";
import {
  BACKGROUND_COLOR_SWATCHES,
  TEXT_COLOR_SWATCHES,
} from "./color-palette";
import { LinkPopover } from "./LinkPopover";
import { applyListType, getActiveListType } from "./list-commands";

export function BubbleToolbar({
  editor,
  blockDragActive = false,
}: {
  editor: Editor;
  blockDragActive?: boolean;
}) {
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [textColorPopoverOpen, setTextColorPopoverOpen] = useState(false);
  const [backgroundColorPopoverOpen, setBackgroundColorPopoverOpen] =
    useState(false);

  const colorPopoverOpen = textColorPopoverOpen || backgroundColorPopoverOpen;
  const activeListType = getActiveListType(editor);

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="ssota-bubble-toolbar"
      shouldShow={({ editor: currentEditor, state }) => {
        const { empty } = state.selection;
        if (blockDragActive || isNodeRangeSelection(state.selection)) {
          return false;
        }
        return (
          currentEditor.isEditable &&
          (linkPopoverOpen ||
            colorPopoverOpen ||
            !empty ||
            currentEditor.isActive("table") ||
            currentEditor.isActive("listItem"))
        );
      }}
      className="ssota-bubble-toolbar"
      data-testid="ssota-bubble-toolbar"
    >
      <TooltipProvider delay={0}>
      <ToolbarButton
        label="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <TextBIcon className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <TextItalicIcon className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Strike"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <TextStrikethroughIcon className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Code"
        active={editor.isActive("code")}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <CodeIcon className="size-4" />
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton
        label="Bullet list"
        active={activeListType === "bulletList"}
        onClick={() => applyListType(editor, "bulletList")}
      >
        <ListBulletsIcon className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        active={activeListType === "orderedList"}
        onClick={() => applyListType(editor, "orderedList")}
      >
        <ListNumbersIcon className="size-4" />
      </ToolbarButton>
      <ToolbarDivider />
      <LinkPopover editor={editor} open={linkPopoverOpen} onOpenChange={setLinkPopoverOpen} />
      <ColorPopover
        editor={editor}
        kind="text"
        label="텍스트색"
        swatches={TEXT_COLOR_SWATCHES}
        open={textColorPopoverOpen}
        onOpenChange={setTextColorPopoverOpen}
      >
        <TextAaIcon className="size-4" />
      </ColorPopover>
      <ColorPopover
        editor={editor}
        kind="background"
        label="배경색"
        swatches={BACKGROUND_COLOR_SWATCHES}
        open={backgroundColorPopoverOpen}
        onOpenChange={setBackgroundColorPopoverOpen}
      >
        <HighlighterCircleIcon className="size-4" />
      </ColorPopover>
      {editor.isActive("table") ? (
        <>
          <ToolbarDivider />
          <ToolbarButton
            label="Add row"
            onClick={() => editor.chain().focus().addRowAfter().run()}
          >
            <RowsIcon className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Add column"
            onClick={() => editor.chain().focus().addColumnAfter().run()}
          >
            <ListBulletsIcon className="size-4 rotate-90" />
          </ToolbarButton>
          <ToolbarButton
            label="Delete table"
            onClick={() => editor.chain().focus().deleteTable().run()}
          >
            <MinusIcon className="size-4" />
          </ToolbarButton>
        </>
      ) : null}
      </TooltipProvider>
    </BubbleMenu>
  );
}

function ToolbarButton({
  label,
  active,
  children,
  onClick,
}: {
  label: string;
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant={active ? "secondary" : "ghost"}
            size="icon-sm"
            aria-label={label}
            onClick={onClick}
            className="ssota-editor-toolbar-button"
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

function ToolbarDivider() {
  return <span className="ssota-toolbar-divider" aria-hidden />;
}
