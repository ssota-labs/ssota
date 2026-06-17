import type { Editor } from "@tiptap/react";

export type EditorColorKind = "text" | "background";

export function getActiveEditorColor(editor: Editor, kind: EditorColorKind): string {
  if (kind === "text") {
    return String(editor.getAttributes("textStyle").color ?? "");
  }
  return String(editor.getAttributes("highlight").color ?? "");
}

export function isEditorColorActive(editor: Editor, kind: EditorColorKind): boolean {
  return Boolean(getActiveEditorColor(editor, kind));
}

export function applyEditorColor(
  editor: Editor,
  kind: EditorColorKind,
  color: string,
) {
  const chain = editor.chain().focus();

  if (kind === "text") {
    if (!color) {
      chain.unsetColor().run();
      return;
    }
    chain.setColor(color).run();
    return;
  }

  if (!color) {
    chain.unsetHighlight().run();
    return;
  }
  chain.setHighlight({ color }).run();
}
