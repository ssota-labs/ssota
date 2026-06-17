import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import NodeRange from "@tiptap/extension-node-range";
import { BulletList, ListKeymap } from "@tiptap/extension-list";
import Placeholder from "@tiptap/extension-placeholder";
import { TableKit } from "@tiptap/extension-table";
import TaskList from "@tiptap/extension-task-list";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import StarterKit from "@tiptap/starter-kit";
import type { Extensions } from "@tiptap/react";
import { SlashCommand } from "./SlashCommand";
import type { SsotaExtensionOptions } from "./types";
import { Callout } from "./extensions/Callout";
import { CalloutTitle } from "./extensions/CalloutTitle";
import { EmojiExtension } from "./extensions/EmojiExtension";
import { createMentionExtension } from "./extensions/MentionExtension";
import { GuardedTaskItem } from "./extensions/GuardedTaskItem";
import {
  MixedBulletList,
  MixedOrderedList,
} from "./extensions/mixed-list-extensions";
import { NestedListItem } from "./extensions/NestedListItem";
import { QuoteShortcut } from "./extensions/QuoteShortcut";
import { ListMarkdownShortcut } from "./extensions/ListMarkdownShortcut";
import { Toggle } from "./extensions/Toggle";

export type { SsotaExtensionOptions } from "./types";

export function ssotaExtensions(options: SsotaExtensionOptions = {}): Extensions {
  const extensions: Extensions = [
    StarterKit.configure({
      link: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
      listKeymap: false,
      blockquote: {
        HTMLAttributes: { class: "ssota-blockquote" },
      },
      dropcursor: {
        color: "var(--primary)",
        width: 2,
        class: "ssota-dropcursor",
      },
    }),
    NodeRange,
    MixedBulletList.configure({
      HTMLAttributes: { class: "ssota-bullet-list" },
    }),
    MixedOrderedList.configure({
      HTMLAttributes: { class: "ssota-ordered-list" },
    }),
    NestedListItem,
    ListKeymap,
    TaskList,
    GuardedTaskItem.configure({ nested: true }),
    TableKit.configure({
      table: {
        resizable: true,
        HTMLAttributes: { class: "ssota-editor-table" },
      },
    }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      defaultProtocol: "https",
    }),
    Image.configure({
      allowBase64: false,
      HTMLAttributes: { class: "ssota-editor-image" },
    }),
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Callout,
    CalloutTitle,
    Toggle,
    QuoteShortcut,
    ListMarkdownShortcut,
    EmojiExtension,
    Placeholder.configure({
      placeholder: ({ node }) => {
        if (node.type.name === "calloutTitle") return "제목";
        return options.placeholder ?? '내용을 입력하거나 ‘/’ · \'" \' 로 인용 블록…';
      },
      includeChildren: true,
    }),
    SlashCommand.configure({
      uploadImage: options.uploadImage,
    }),
  ];

  if (options.mentionSearch) {
    extensions.push(createMentionExtension(options.mentionSearch));
  }

  return extensions;
}
