"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/react";
import { useEffect } from "react";
import { BubbleToolbar } from "./BubbleToolbar";
import { DragBlockHandle } from "./DragBlockHandle";
import { ssotaExtensions } from "./extensions";

export interface SsotaEditorProps {
  /** Initial document (ProseMirror/Tiptap JSON). Omit for an empty doc. */
  content?: JSONContent | null;
  /** Placeholder shown when the document is empty. */
  placeholder?: string;
  /** Whether the document can be edited. Defaults to true. */
  editable?: boolean;
  /** Called (debounced by the host) on every document change with the latest JSON. */
  onChange?: (doc: JSONContent) => void;
  /** Extra class names for the editor surface. */
  className?: string;
}

export function SsotaEditor({
  content,
  placeholder,
  editable = true,
  onChange,
  className,
}: SsotaEditorProps) {
  const editor = useEditor({
    extensions: ssotaExtensions({ placeholder }),
    content: content ?? undefined,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange?.(editor.getJSON()),
    editorProps: {
      attributes: {
        class: ["ssota-editor", className].filter(Boolean).join(" "),
      },
    },
  });

  // Keep the editor's editable state in sync with the prop.
  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  if (!editor) {
    return null;
  }

  return (
    <div className="ssota-editor-shell">
      {editable ? <BubbleToolbar editor={editor} /> : null}
      {editable ? <DragBlockHandle editor={editor} /> : null}
      <EditorContent editor={editor} />
    </div>
  );
}
