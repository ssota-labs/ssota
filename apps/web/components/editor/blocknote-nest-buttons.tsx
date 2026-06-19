"use client";

import {
  formatKeyboardShortcut,
  type BlockSchema,
  type InlineContentSchema,
  type StyleSchema,
} from "@blocknote/core";
import {
  useBlockNoteEditor,
  useComponentsContext,
  useDictionary,
  useEditorState,
} from "@blocknote/react";
import { useCallback } from "react";
import { TextIndentIcon, TextOutdentIcon } from "@phosphor-icons/react";

export function BlockNoteNestBlockButton() {
  const dict = useDictionary();
  const Components = useComponentsContext()!;

  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const state = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (
        !editor.isEditable ||
        !(
          editor.getSelection()?.blocks || [
            editor.getTextCursorPosition().block,
          ]
        ).find((block) => block.content !== undefined)
      ) {
        return undefined;
      }

      return {
        canNestBlock: editor.canNestBlock(),
      };
    },
  });

  const nestBlock = useCallback(() => {
    if (state !== undefined && state.canNestBlock) {
      editor.focus();
      editor.nestBlock();
    }
  }, [editor, state]);

  if (state === undefined) {
    return null;
  }

  return (
    <Components.FormattingToolbar.Button
      className="bn-button"
      data-test="nestBlock"
      isSelected={false}
      onClick={nestBlock}
      isDisabled={!state.canNestBlock}
      label={dict.formatting_toolbar.nest.tooltip}
      mainTooltip={dict.formatting_toolbar.nest.tooltip}
      secondaryTooltip={formatKeyboardShortcut(
        dict.formatting_toolbar.nest.secondary_tooltip,
        dict.generic.ctrl_shortcut,
      )}
      icon={<TextIndentIcon className="size-4" />}
    />
  );
}

export function BlockNoteUnnestBlockButton() {
  const dict = useDictionary();
  const Components = useComponentsContext()!;

  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const state = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (
        !editor.isEditable ||
        !(
          editor.getSelection()?.blocks || [
            editor.getTextCursorPosition().block,
          ]
        ).find((block) => block.content !== undefined)
      ) {
        return undefined;
      }

      return {
        canUnnestBlock: editor.canUnnestBlock(),
      };
    },
  });

  const unnestBlock = useCallback(() => {
    if (state !== undefined && state.canUnnestBlock) {
      editor.focus();
      editor.unnestBlock();
    }
  }, [editor, state]);

  if (state === undefined) {
    return null;
  }

  return (
    <Components.FormattingToolbar.Button
      className="bn-button"
      data-test="unnestBlock"
      isSelected={false}
      onClick={unnestBlock}
      isDisabled={!state.canUnnestBlock}
      label={dict.formatting_toolbar.unnest.tooltip}
      mainTooltip={dict.formatting_toolbar.unnest.tooltip}
      secondaryTooltip={formatKeyboardShortcut(
        dict.formatting_toolbar.unnest.secondary_tooltip,
        dict.generic.ctrl_shortcut,
      )}
      icon={<TextOutdentIcon className="size-4" />}
    />
  );
}
