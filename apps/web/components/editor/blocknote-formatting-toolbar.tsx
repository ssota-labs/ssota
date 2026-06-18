"use client";

import {
  BasicTextStyleButton,
  BlockTypeSelect,
  FormattingToolbar,
  TextAlignButton,
} from "@blocknote/react";

import {
  BlockNoteBackgroundColorButton,
  BlockNoteTextColorButton,
} from "./blocknote-color-buttons";
import { BlockNoteCreateLinkButton } from "./blocknote-create-link-button";
import {
  BlockNoteNestBlockButton,
  BlockNoteUnnestBlockButton,
} from "./blocknote-nest-buttons";

export function BlockNoteFormattingToolbar() {
  return (
    <FormattingToolbar>
      <BlockTypeSelect key="blockTypeSelect" />
      <BasicTextStyleButton basicTextStyle="bold" key="boldStyleButton" />
      <BasicTextStyleButton basicTextStyle="italic" key="italicStyleButton" />
      <BasicTextStyleButton
        basicTextStyle="underline"
        key="underlineStyleButton"
      />
      <BasicTextStyleButton basicTextStyle="strike" key="strikeStyleButton" />
      <TextAlignButton textAlignment="left" key="textAlignLeftButton" />
      <TextAlignButton textAlignment="center" key="textAlignCenterButton" />
      <TextAlignButton textAlignment="right" key="textAlignRightButton" />
      <BlockNoteTextColorButton key="textColorButton" />
      <BlockNoteBackgroundColorButton key="backgroundColorButton" />
      <BlockNoteNestBlockButton key="nestBlockButton" />
      <BlockNoteUnnestBlockButton key="unnestBlockButton" />
      <BlockNoteCreateLinkButton key="createLinkButton" />
    </FormattingToolbar>
  );
}
