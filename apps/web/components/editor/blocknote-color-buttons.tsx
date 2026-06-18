"use client";

import type {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useCallback, useMemo } from "react";

import { useBlockNoteEditor } from "@blocknote/react";
import { useComponentsContext } from "@blocknote/react";
import { useDictionary } from "@blocknote/react";
import { useEditorState } from "@blocknote/react";

const COLORS = [
  "default",
  "gray",
  "brown",
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
] as const;

type ColorName = (typeof COLORS)[number];

function BlockNoteColorIcon({
  textColor,
  backgroundColor,
  size = 16,
}: {
  textColor?: string;
  backgroundColor?: string;
  size?: number;
}) {
  const style = useMemo(
    () =>
      ({
        pointerEvents: "none",
        fontSize: `${size * 0.75}px`,
        height: `${size}px`,
        lineHeight: `${size}px`,
        textAlign: "center",
        width: `${size}px`,
      }) as const,
    [size],
  );

  return (
    <div
      className="bn-color-icon"
      data-background-color={backgroundColor ?? "default"}
      data-text-color={textColor ?? "default"}
      style={style}
    >
      A
    </div>
  );
}

function BlockNoteColorMenu({
  kind,
  color,
  setColor,
}: {
  kind: "text" | "background";
  color: string;
  setColor: (color: string) => void;
}) {
  const Components = useComponentsContext()!;
  const dict = useDictionary();
  const title =
    kind === "text"
      ? dict.color_picker.text_title
      : dict.color_picker.background_title;

  return (
    <>
      <Components.Generic.Menu.Label>{title}</Components.Generic.Menu.Label>
      {COLORS.map((name) => (
        <Components.Generic.Menu.Item
          key={`${kind}-color-${name}`}
          data-test={`${kind}-color-${name}`}
          icon={
            <BlockNoteColorIcon
              textColor={kind === "text" ? name : undefined}
              backgroundColor={kind === "background" ? name : undefined}
              size={16}
            />
          }
          checked={color === name}
          onClick={() => {
            setColor(name);
          }}
        >
          {dict.color_picker.colors[name as ColorName]}
        </Components.Generic.Menu.Item>
      ))}
    </>
  );
}

function checkColorInSchema<Color extends "text" | "background">(
  color: Color,
  editor: BlockNoteEditor<BlockSchema, InlineContentSchema, StyleSchema>,
): editor is BlockNoteEditor<
  BlockSchema,
  InlineContentSchema,
  Color extends "text"
    ? {
        textColor: {
          type: "textColor";
          propSchema: "string";
        };
      }
    : {
        backgroundColor: {
          type: "backgroundColor";
          propSchema: "string";
        };
      }
> {
  const style = editor.schema.styleSchema[`${color}Color`];
  return (
    `${color}Color` in editor.schema.styleSchema &&
    style?.type === `${color}Color` &&
    style.propSchema === "string"
  );
}

function useTextColorStyleState() {
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

      if (!checkColorInSchema("text", editor)) {
        return undefined;
      }

      return {
        color: (editor.getActiveStyles().textColor || "default") as string,
      };
    },
  });

  const setColor = useCallback(
    (color: string) => {
      if (!checkColorInSchema("text", editor)) {
        throw new Error(
          "Tried to set text color, but style does not exist in editor schema.",
        );
      }

      if (color === "default") {
        editor.removeStyles({ textColor: color });
      } else {
        editor.addStyles({ textColor: color });
      }

      window.setTimeout(() => {
        editor.focus();
      });
    },
    [editor],
  );

  return { state, setColor };
}

function useBackgroundColorStyleState() {
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

      if (!checkColorInSchema("background", editor)) {
        return undefined;
      }

      return {
        color: (editor.getActiveStyles().backgroundColor || "default") as string,
      };
    },
  });

  const setColor = useCallback(
    (color: string) => {
      if (!checkColorInSchema("background", editor)) {
        throw new Error(
          "Tried to set background color, but style does not exist in editor schema.",
        );
      }

      if (color === "default") {
        editor.removeStyles({ backgroundColor: color });
      } else {
        editor.addStyles({ backgroundColor: color });
      }

      window.setTimeout(() => {
        editor.focus();
      });
    },
    [editor],
  );

  return { state, setColor };
}

export function BlockNoteTextColorButton() {
  const Components = useComponentsContext()!;
  const dict = useDictionary();
  const { state, setColor } = useTextColorStyleState();

  if (state === undefined) {
    return null;
  }

  return (
    <Components.Generic.Menu.Root>
      <Components.Generic.Menu.Trigger>
        <Components.FormattingToolbar.Button
          className="bn-button"
          data-test="text-color"
          label={dict.color_picker.text_title}
          mainTooltip={dict.color_picker.text_title}
          icon={<BlockNoteColorIcon textColor={state.color} size={20} />}
        />
      </Components.Generic.Menu.Trigger>
      <Components.Generic.Menu.Dropdown
        className="bn-menu-dropdown bn-color-picker-dropdown"
      >
        <BlockNoteColorMenu kind="text" color={state.color} setColor={setColor} />
      </Components.Generic.Menu.Dropdown>
    </Components.Generic.Menu.Root>
  );
}

export function BlockNoteBackgroundColorButton() {
  const Components = useComponentsContext()!;
  const dict = useDictionary();
  const { state, setColor } = useBackgroundColorStyleState();

  if (state === undefined) {
    return null;
  }

  return (
    <Components.Generic.Menu.Root>
      <Components.Generic.Menu.Trigger>
        <Components.FormattingToolbar.Button
          className="bn-button"
          data-test="background-color"
          label={dict.color_picker.background_title}
          mainTooltip={dict.color_picker.background_title}
          icon={
            <BlockNoteColorIcon backgroundColor={state.color} size={20} />
          }
        />
      </Components.Generic.Menu.Trigger>
      <Components.Generic.Menu.Dropdown
        className="bn-menu-dropdown bn-color-picker-dropdown"
      >
        <BlockNoteColorMenu
          kind="background"
          color={state.color}
          setColor={setColor}
        />
      </Components.Generic.Menu.Dropdown>
    </Components.Generic.Menu.Root>
  );
}
