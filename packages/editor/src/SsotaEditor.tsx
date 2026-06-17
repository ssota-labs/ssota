"use client";

import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { BubbleToolbar } from "./BubbleToolbar";
import { DragBlockHandle } from "./DragBlockHandle";
import { insertUploadedImage } from "./extensions/MentionExtension";
import { ssotaExtensions } from "./extensions";
import type { SsotaExtensionOptions } from "./types";

export interface SsotaEditorProps extends SsotaExtensionOptions {
  /** Initial document (ProseMirror/Tiptap JSON). Omit for an empty doc. */
  content?: JSONContent | null;
  /** Whether the document can be edited. Defaults to true. */
  editable?: boolean;
  /** Called (debounced by the host) on every document change with the latest JSON. */
  onChange?: (doc: JSONContent) => void;
  /** Extra class names for the editor surface. */
  className?: string;
  /** Called once when the editor instance is ready (e.g. E2E harness). */
  onEditorReady?: (editor: Editor) => void;
}

export function SsotaEditor({
  content,
  placeholder,
  mentionSearch,
  uploadImage,
  editable = true,
  onChange,
  className,
  onEditorReady,
}: SsotaEditorProps) {
  const editorRef = useRef<Editor | null>(null);
  const uploadImageRef = useRef(uploadImage);
  const [blockDragActive, setBlockDragActive] = useState(false);
  uploadImageRef.current = uploadImage;

  const extensionOptions = useMemo(
    () => ({ placeholder, mentionSearch, uploadImage }),
    [mentionSearch, placeholder, uploadImage],
  );

  const editor = useEditor({
    extensions: ssotaExtensions(extensionOptions),
    content: content ?? undefined,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor: currentEditor }) => onChange?.(currentEditor.getJSON()),
    editorProps: {
      attributes: {
        class: ["ssota-editor", className].filter(Boolean).join(" "),
        "data-testid": "ssota-editor-surface",
      },
      handleDrop: (_view, event, _slice, moved) => {
        const upload = uploadImageRef.current;
        if (moved || !upload || !event.dataTransfer?.files?.length) {
          return false;
        }

        const file = event.dataTransfer.files[0];
        if (!file?.type.startsWith("image/")) return false;

        event.preventDefault();
        const currentEditor = editorRef.current;
        if (currentEditor) {
          void insertUploadedImage(currentEditor, file, upload);
        }
        return true;
      },
      handlePaste: (_view, event) => {
        const upload = uploadImageRef.current;
        if (!upload) return false;

        const file = event.clipboardData?.files?.[0];
        if (!file?.type.startsWith("image/")) return false;

        event.preventDefault();
        const currentEditor = editorRef.current;
        if (currentEditor) {
          void insertUploadedImage(currentEditor, file, upload);
        }
        return true;
      },
    },
  });

  editorRef.current = editor;

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    if (editor) onEditorReady?.(editor);
  }, [editor, onEditorReady]);

  if (!editor) {
    return null;
  }

  return (
    <div className="ssota-editor-shell" data-testid="ssota-editor-shell">
      {editable ? (
        <BubbleToolbar editor={editor} blockDragActive={blockDragActive} />
      ) : null}
      {editable ? (
        <DragBlockHandle
          editor={editor}
          onDragActiveChange={setBlockDragActive}
        />
      ) : null}
      <EditorContent editor={editor} />
    </div>
  );
}
