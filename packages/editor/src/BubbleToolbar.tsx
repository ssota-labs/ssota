"use client";

import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import {
  CodeIcon,
  HighlighterCircleIcon,
  ListBulletsIcon,
  MinusIcon,
  RowsIcon,
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
import { LinkPopover } from "./LinkPopover";

export function BubbleToolbar({ editor }: { editor: Editor }) {
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="ssota-bubble-toolbar"
      shouldShow={({ editor: currentEditor, state }) => {
        const { empty } = state.selection;
        return (
          currentEditor.isEditable &&
          (linkPopoverOpen || !empty || currentEditor.isActive("table"))
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
      <LinkPopover editor={editor} open={linkPopoverOpen} onOpenChange={setLinkPopoverOpen} />
      <ToolbarButton
        label="Highlight"
        active={editor.isActive("highlight")}
        onClick={() =>
          editor
            .chain()
            .focus()
            .toggleHighlight({ color: "var(--accent)" })
            .run()
        }
      >
        <HighlighterCircleIcon className="size-4" />
      </ToolbarButton>
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
            size="icon-xs"
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
  return <span className="h-5 w-px bg-border" />;
}
