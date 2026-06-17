import { Editor } from "@tiptap/core";
import { ListKeymap } from "@tiptap/extension-list";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it, afterEach } from "vitest";
import {
  MixedBulletList,
  MixedOrderedList,
} from "./extensions/mixed-list-extensions";
import { NestedListItem } from "./extensions/NestedListItem";
import {
  applyListType,
  convertInnermostListType,
  getActiveListType,
  hasMixedListNesting,
} from "./list-commands";

function selectText(editor: Editor, text: string) {
  let found = false;
  editor.state.doc.descendants((node, pos) => {
    if (found || !node.isText || node.text !== text) return;
    editor.commands.setTextSelection(pos + 1);
    found = true;
  });
  expect(found).toBe(true);
}

function createEditor(content?: object) {
  const element = document.createElement("div");
  document.body.appendChild(element);

  return new Editor({
    element,
    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
        listItem: false,
        listKeymap: false,
      }),
      MixedBulletList,
      MixedOrderedList,
      NestedListItem,
      ListKeymap,
    ],
    content,
  });
}

describe("applyListType", () => {
  let editor: Editor | null = null;

  afterEach(() => {
    editor?.destroy();
    editor = null;
  });

  it("creates a bullet list outside lists", () => {
    editor = createEditor({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "line" }] },
      ],
    });
    selectText(editor, "line");

    expect(applyListType(editor, "bulletList")).toBe(true);
    expect(getActiveListType(editor)).toBe("bulletList");
    expect(editor.getJSON().content?.[0]?.type).toBe("bulletList");
  });

  it("nests bullet under numbered sibling at same level", () => {
    editor = createEditor({
      type: "doc",
      content: [
        {
          type: "orderedList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "one" }],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "two" }],
                },
              ],
            },
          ],
        },
      ],
    });
    selectText(editor, "two");

    expect(getActiveListType(editor)).toBe("orderedList");
    expect(applyListType(editor, "bulletList")).toBe(true);
    expect(hasMixedListNesting(editor.state.doc)).toBe(true);
    expect(getActiveListType(editor)).toBe("bulletList");
  });

  it("strips markdown marker when toggling list from paragraph text", () => {
    editor = createEditor({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "1. numbered line" }],
        },
      ],
    });
    selectText(editor, "1. numbered line");

    expect(applyListType(editor, "orderedList")).toBe(true);
    expect(getActiveListType(editor)).toBe("orderedList");
    const listItem = editor.getJSON().content?.[0];
    expect(listItem?.type).toBe("orderedList");
    const paragraphText =
      listItem?.content?.[0]?.content?.[0]?.content?.[0]?.text;
    expect(paragraphText).toBe("numbered line");
  });

  it("converts innermost ordered list to bullet", () => {
    editor = createEditor({
      type: "doc",
      content: [
        {
          type: "orderedList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "numbered" }],
                },
              ],
            },
          ],
        },
      ],
    });
    selectText(editor, "numbered");

    expect(getActiveListType(editor)).toBe("orderedList");
    expect(convertInnermostListType(editor, "bulletList")).toBe(true);
    expect(getActiveListType(editor)).toBe("bulletList");
  });

  it("converts only the innermost list level", () => {
    editor = createEditor({
      type: "doc",
      content: [
        {
          type: "orderedList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "parent" }],
                },
                {
                  type: "bulletList",
                  content: [
                    {
                      type: "listItem",
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "child" }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    selectText(editor, "child");

    expect(getActiveListType(editor)).toBe("bulletList");
    expect(applyListType(editor, "orderedList")).toBe(true);
    expect(getActiveListType(editor)).toBe("orderedList");
    expect(hasMixedListNesting(editor.state.doc)).toBe(true);
  });
});
