"use client";

import {
  BasicTextStyleButton,
  BlockTypeSelect,
  CreateLinkButton,
  FormattingToolbar,
  NestBlockButton,
  TextAlignButton,
  UnnestBlockButton,
} from "@blocknote/react";

import {
  BlockNoteBackgroundColorButton,
  BlockNoteTextColorButton,
} from "./blocknote-color-buttons";

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
      <NestBlockButton key="nestBlockButton" />
      <UnnestBlockButton key="unnestBlockButton" />
      <CreateLinkButton key="createLinkButton" />
    </FormattingToolbar>
  );
}
