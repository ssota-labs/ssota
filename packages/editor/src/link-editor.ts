import { getMarkRange } from "@tiptap/core";
import type { Editor } from "@tiptap/react";

export type LinkSelectionRange = {
  from: number;
  to: number;
};

export type LinkFormValues = {
  href: string;
  title: string;
  range: LinkSelectionRange;
  hadLink: boolean;
};

export function readLinkForm(editor: Editor): LinkFormValues {
  const { from, to } = editor.state.selection;
  const hadLink = editor.isActive("link");
  let range: LinkSelectionRange = { from, to };

  if (hadLink) {
    const $pos = editor.state.doc.resolve(from);
    const markRange = getMarkRange($pos, editor.schema.marks.link);
    if (markRange) {
      range = markRange;
    }
  }

  const href = hadLink ? String(editor.getAttributes("link").href ?? "") : "";
  const title = editor.state.doc.textBetween(range.from, range.to, "");

  return { href, title, range, hadLink };
}

export function applyLinkForm(
  editor: Editor,
  range: LinkSelectionRange,
  href: string,
  title: string,
) {
  const trimmedHref = href.trim();
  const trimmedTitle = title.trim();

  editor.chain().focus().setTextSelection(range).run();

  if (!trimmedHref) {
    if (editor.isActive("link")) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    }
    return;
  }

  const { from, to } = range;
  const currentText = editor.state.doc.textBetween(from, to, "");
  const nextText = trimmedTitle || currentText || trimmedHref;

  if (from === to) {
    editor
      .chain()
      .focus()
      .insertContentAt(from, {
        type: "text",
        text: nextText,
        marks: [{ type: "link", attrs: { href: trimmedHref } }],
      })
      .run();
    return;
  }

  editor
    .chain()
    .focus()
    .insertContentAt(
      { from, to },
      {
        type: "text",
        text: nextText,
        marks: [{ type: "link", attrs: { href: trimmedHref } }],
      },
    )
    .run();
}
