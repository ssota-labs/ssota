"use client";

import Emoji, { emojis, type EmojiItem } from "@tiptap/extension-emoji";
import type { SuggestionProps } from "@tiptap/suggestion";
import { SuggestionMenu } from "../ui/SuggestionMenu";
import {
  createSuggestionPortal,
  type SuggestionPortalInjectedProps,
} from "../ui/suggestion-portal";

function filterEmojis(query: string): EmojiItem[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return emojis.slice(0, 12);
  }

  return emojis
    .filter((item) => {
      const haystack = [
        item.name,
        ...item.shortcodes,
        ...(item.tags ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    })
    .slice(0, 12);
}

function mapEmojiMenuProps(props: SuggestionProps<EmojiItem>) {
  return {
    ariaLabel: "Insert emoji",
    emptyLabel: "No emojis found",
    items: props.items.map((item) => ({
      id: item.name,
      title: item.emoji ?? item.name,
      description: `:${item.shortcodes[0]}:`,
    })),
    onSelect: (menuItem: { id: string }) => {
      const match = props.items.find((item) => item.name === menuItem.id);
      if (match) props.command(match);
    },
  };
}

const emojiSuggestionRenderer = createSuggestionPortal<
  EmojiItem,
  ReturnType<typeof mapEmojiMenuProps> & SuggestionPortalInjectedProps
>({
  component: SuggestionMenu,
  mapProps: (props, menu) => ({
    ...mapEmojiMenuProps(props),
    ...menu,
  }),
});

export const EmojiExtension = Emoji.configure({
  HTMLAttributes: {
    class: "ssota-emoji",
  },
  enableEmoticons: true,
  suggestion: {
    char: ":",
    allowSpaces: false,
    allowedPrefixes: null,
    items: ({ query }) => filterEmojis(query),
    command: ({ editor, range, props }) => {
      const item = props as EmojiItem;
      editor
        .chain()
        .focus()
        .insertContentAt(range, [
          {
            type: "emoji",
            attrs: { name: item.name },
          },
          { type: "text", text: " " },
        ])
        .run();
    },
    render: () => emojiSuggestionRenderer,
  },
});
