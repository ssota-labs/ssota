import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { TableKit } from "@tiptap/extension-table";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import StarterKit from "@tiptap/starter-kit";
import type { Extensions } from "@tiptap/react";
import { SlashCommand } from "./SlashCommand";

export interface SsotaExtensionOptions {
  /** Placeholder text shown in an empty document. */
  placeholder?: string;
}

export function ssotaExtensions(
  options: SsotaExtensionOptions = {},
): Extensions {
  return [
    StarterKit,
    TaskList,
    TaskItem.configure({ nested: true }),
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
    SlashCommand,
    Placeholder.configure({
      placeholder: options.placeholder ?? "내용을 입력하거나 ‘/’ 를 눌러보세요…",
    }),
  ];
}
