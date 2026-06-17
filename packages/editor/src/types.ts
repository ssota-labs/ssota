import type { JSONContent } from "@tiptap/react";

export type SsotaMentionItem = {
  id: string;
  label: string;
  nodeType?: string;
};

export type SsotaExtensionOptions = {
  /** Placeholder text shown in an empty document. */
  placeholder?: string;
  /** Resolve @mention suggestions for SSOTA node links. */
  mentionSearch?: (query: string) => Promise<SsotaMentionItem[]>;
  /** Upload an image file and return a public URL for the editor. */
  uploadImage?: (file: File) => Promise<string>;
};

export type { JSONContent };
