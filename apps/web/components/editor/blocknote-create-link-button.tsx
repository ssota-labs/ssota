"use client";

import {
  formatKeyboardShortcut,
  isTableCellSelection,
  type BlockNoteEditor,
  type BlockSchema,
  type InlineContentSchema,
  type StyleSchema,
} from "@blocknote/core";
import {
  FormattingToolbarExtension,
  ShowSelectionExtension,
} from "@blocknote/core/extensions";
import {
  EditLinkMenuItems,
  useBlockNoteEditor,
  useComponentsContext,
  useDictionary,
  useEditorDOMElement,
  useEditorState,
  useExtension,
} from "@blocknote/react";
import { LinkIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

function hasLinkInSchema(
  editor: BlockNoteEditor<BlockSchema, InlineContentSchema, StyleSchema>,
) {
  return (
    "link" in editor.schema.inlineContentSchema &&
    editor.schema.inlineContentSchema.link === "link"
  );
}

export function BlockNoteCreateLinkButton() {
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();
  const editorDOMElement = useEditorDOMElement();
  const Components = useComponentsContext()!;
  const dict = useDictionary();

  const formattingToolbar = useExtension(FormattingToolbarExtension);
  const { showSelection } = useExtension(ShowSelectionExtension);

  const [showPopover, setShowPopover] = useState(false);
  useEffect(() => {
    showSelection(showPopover, "createLinkButton");
    return () => showSelection(false, "createLinkButton");
  }, [showPopover, showSelection]);

  const state = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (
        !editor.isEditable ||
        !hasLinkInSchema(editor) ||
        isTableCellSelection(editor.prosemirrorState.selection) ||
        !(
          editor.getSelection()?.blocks || [
            editor.getTextCursorPosition().block,
          ]
        ).find((block) => block.content !== undefined)
      ) {
        return undefined;
      }

      return {
        url: editor.getSelectedLinkUrl(),
        text: editor.getSelectedText(),
        range: {
          from: editor.prosemirrorState.selection.from,
          to: editor.prosemirrorState.selection.to,
        },
      };
    },
  });

  useEffect(() => {
    setShowPopover(false);
  }, [state]);

  useEffect(() => {
    const callback = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        setShowPopover(true);
        event.preventDefault();
      }
    };

    editorDOMElement?.addEventListener("keydown", callback);

    return () => {
      editorDOMElement?.removeEventListener("keydown", callback);
    };
  }, [editorDOMElement]);

  if (state === undefined) {
    return null;
  }

  return (
    <Components.Generic.Popover.Root
      open={showPopover}
      onOpenChange={setShowPopover}
    >
      <Components.Generic.Popover.Trigger>
        <Components.FormattingToolbar.Button
          className="bn-button"
          data-test="createLink"
          isSelected={false}
          label={dict.formatting_toolbar.link.tooltip}
          mainTooltip={dict.formatting_toolbar.link.tooltip}
          secondaryTooltip={formatKeyboardShortcut(
            dict.formatting_toolbar.link.secondary_tooltip,
            dict.generic.ctrl_shortcut,
          )}
          icon={<LinkIcon className="size-4" />}
          onClick={() => setShowPopover((open) => !open)}
        />
      </Components.Generic.Popover.Trigger>
      <Components.Generic.Popover.Content
        className="bn-popover-content bn-form-popover"
        variant="form-popover"
      >
        <EditLinkMenuItems
          url={state.url || ""}
          text={state.text}
          range={state.range}
          showTextField={false}
          setToolbarOpen={(open) => formattingToolbar.store.setState(open)}
        />
      </Components.Generic.Popover.Content>
    </Components.Generic.Popover.Root>
  );
}
