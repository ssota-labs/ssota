"use client";

import Mention from "@tiptap/extension-mention";
import { ReactRenderer, type Editor } from "@tiptap/react";
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";
import { AtIcon } from "@phosphor-icons/react";
import type { SsotaMentionItem } from "../types";
import {
  SuggestionMenu,
  type SuggestionMenuHandle,
} from "../ui/SuggestionMenu";

function positionMenu(element: HTMLElement, props: SuggestionProps<SsotaMentionItem>) {
  const rect = props.clientRect?.();
  if (!rect) return;
  element.style.position = "fixed";
  element.style.left = `${rect.left}px`;
  element.style.top = `${rect.bottom + 8}px`;
  element.style.zIndex = "70";
}

function createSuggestionRenderer() {
  let component: ReactRenderer<SuggestionMenuHandle> | null = null;
  let root: HTMLElement | null = null;

  return {
    onStart: (props: SuggestionProps<SsotaMentionItem>) => {
      root = document.createElement("div");
      document.body.appendChild(root);
      component = new ReactRenderer(SuggestionMenu, {
        props: {
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
        },
        editor: props.editor,
      });
      root.appendChild(component.element);
      positionMenu(root, props);
    },
    onUpdate: (props: SuggestionProps<SsotaMentionItem>) => {
      component?.updateProps({
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
}

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
      render: createSuggestionRenderer,
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
