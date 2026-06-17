"use client";

import Mention from "@tiptap/extension-mention";
import type { Editor } from "@tiptap/react";
import { AtIcon } from "@phosphor-icons/react";
import type { SsotaMentionItem } from "../types";
import { SuggestionMenu } from "../ui/SuggestionMenu";
import {
  createSuggestionPortal,
  type SuggestionPortalInjectedProps,
} from "../ui/suggestion-portal";

function mapMentionMenuProps(
  props: import("@tiptap/suggestion").SuggestionProps<SsotaMentionItem>,
) {
  return {
    ariaLabel: "Mention node",
    emptyLabel: "No nodes found",
    items: props.items.map((item) => ({
      id: item.id,
      title: item.label,
      description: item.nodeType,
      icon: <AtIcon className="size-4" />,
    })),
    onSelect: (menuItem: { id: string }) => {
      const match = props.items.find((item) => item.id === menuItem.id);
      if (match) props.command(match);
    },
  };
}

const mentionSuggestionRenderer = createSuggestionPortal<
  SsotaMentionItem,
  ReturnType<typeof mapMentionMenuProps> & SuggestionPortalInjectedProps
>({
  component: SuggestionMenu,
  mapProps: (props, menu) => ({
    ...mapMentionMenuProps(props),
    ...menu,
  }),
});

export function createMentionExtension(
  mentionSearch: (query: string) => Promise<SsotaMentionItem[]>,
) {
  return Mention.configure({
    HTMLAttributes: {
      class: "ssota-mention",
      "data-type": "mention",
    },
    renderText: ({ node }) => `@${node.attrs.label ?? node.attrs.id}`,
    renderHTML: ({ node }) => [
      "span",
      {
        "data-type": "mention",
        "data-id": node.attrs.id,
        "data-label": node.attrs.label,
        class: "ssota-mention",
      },
      `@${node.attrs.label ?? node.attrs.id}`,
    ],
    suggestion: {
      char: "@",
      allowSpaces: false,
      items: async ({ query }) => mentionSearch(query),
      command: ({ editor, range, props }) => {
        const item = props as SsotaMentionItem;
        editor
          .chain()
          .focus()
          .insertContentAt(range, [
            {
              type: "mention",
              attrs: {
                id: item.id,
                label: item.label,
              },
            },
            { type: "text", text: " " },
          ])
          .run();
      },
      render: () => mentionSuggestionRenderer,
    },
  });
}

export async function insertUploadedImage(
  editor: Editor,
  file: File,
  uploadImage: (file: File) => Promise<string>,
) {
  if (!file.type.startsWith("image/")) return;
  const src = await uploadImage(file);
  editor.chain().focus().setImage({ src, alt: file.name }).run();
}

export function pickImageFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}
