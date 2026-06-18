"use client";

import type {
  Block,
  BlockNoteEditor as BlockNoteEditorInstance,
  PartialBlock,
} from "@blocknote/core";
import { ko } from "@blocknote/core/locales";
import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useRef } from "react";

declare global {
  interface Window {
    __ssotaBlockNoteLab?: BlockNoteEditorInstance;
  }
}

const dictionary = {
  ...ko,
  placeholders: {
    ...ko.placeholders,
    default: "내용을 입력하거나 '/'를 누르세요",
  },
};

export interface SsotaBlockNoteEditorProps {
  initialContent?: PartialBlock[];
  uploadImage?: (file: File) => Promise<string>;
  editable?: boolean;
  onChange?: (blocks: Block[]) => void;
  onEditorReady?: (editor: BlockNoteEditorInstance) => void;
  className?: string;
}

export function SsotaBlockNoteEditor({
  initialContent,
  uploadImage,
  editable = true,
  onChange,
  onEditorReady,
  className,
}: SsotaBlockNoteEditorProps) {
  const { resolvedTheme } = useTheme();
  const uploadImageRef = useRef(uploadImage);
  uploadImageRef.current = uploadImage;

  const blockNoteTheme =
    resolvedTheme === "dark"
      ? "dark"
      : resolvedTheme === "light"
        ? "light"
        : undefined;

  const editorOptions = useMemo(() => {
    const base = {
      dictionary,
      initialContent,
    };

    if (!uploadImage) {
      return base;
    }

    return {
      ...base,
      uploadFile: async (file: File) => {
        const upload = uploadImageRef.current;
        if (!upload) {
          throw new Error("Image upload is not configured");
        }
        return upload(file);
      },
    };
  }, [initialContent, uploadImage]);

  const editor = useCreateBlockNote(editorOptions, [initialContent, uploadImage]);

  const handleChange = useCallback(() => {
    onChange?.(editor.document);
  }, [editor, onChange]);

  useEffect(() => {
    onEditorReady?.(editor);
    window.__ssotaBlockNoteLab = editor;

    return () => {
      delete window.__ssotaBlockNoteLab;
    };
  }, [editor, onEditorReady]);

  return (
    <div
      className={["blocknote-editor-shell", className].filter(Boolean).join(" ")}
      data-testid="blocknote-editor-shell"
    >
      <BlockNoteView
        editor={editor}
        editable={editable}
        onChange={handleChange}
        theme={blockNoteTheme}
      />
    </div>
  );
}
