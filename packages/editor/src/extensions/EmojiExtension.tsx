"use client";

import Emoji, { emojis, type EmojiItem } from "@tiptap/extension-emoji";
import { ReactRenderer } from "@tiptap/react";
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";

import {
  SuggestionMenu,
  type SuggestionMenuHandle,
} from "../ui/SuggestionMenu";

function positionMenu(element: HTMLElement, props: SuggestionProps<EmojiItem>) {
  const rect = props.clientRect?.();
  if (!rect) return;
  element.style.position = "fixed";
  element.style.left = `${rect.left}px`;
  element.style.top = `${rect.bottom + 8}px`;
  element.style.zIndex = "70";
}

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

export const EmojiExtension = Emoji.configure({
  HTMLAttributes: {
    class: "ssota-emoji",
  },
  enableEmoticons: true,
  suggestion: {
    char: ":",
    allowSpaces: false,
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
    render: () => {
      let component: ReactRenderer<SuggestionMenuHandle> | null = null;
      let root: HTMLElement | null = null;

      return {
        onStart: (props: SuggestionProps<EmojiItem>) => {
          root = document.createElement("div");
          document.body.appendChild(root);
          component = new ReactRenderer(SuggestionMenu, {
            props: {
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
            },
            editor: props.editor,
          });
          root.appendChild(component.element);
          if (root) positionMenu(root, props);
        },
        onUpdate: (props: SuggestionProps<EmojiItem>) => {
          component?.updateProps({
            items: props.items.map((item) => ({
              id: item.name,
              title: item.emoji ?? item.name,
              description: `:${item.shortcodes[0]}:`,
            })),
            onSelect: (menuItem: { id: string }) => {
              const match = props.items.find((item) => item.name === menuItem.id);
              if (match) props.command(match);
            },
          });
          if (root) positionMenu(root, props);
        },
        onKeyDown: (props: SuggestionKeyDownProps) => {
          if (props.event.key === "Escape") return false;
          return component?.ref?.onKeyDown(props) ?? false;
        },
        onExit: () => {
          component?.destroy();
          root?.remove();
          component = null;
          root = null;
        },
      };
    },
  },
});
