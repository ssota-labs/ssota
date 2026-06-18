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
  convertListItemToSiblingListType,
  findInnermostList,
  getActiveListType,
  hasMixedListNesting,
} from "./list-commands";

type JsonNode = {
  type?: string;
  content?: JsonNode[];
  text?: string;
};

function selectText(editor: Editor, text: string) {
  let found = false;
  editor.state.doc.descendants((node, pos) => {
    if (found || !node.isTextblock || node.textContent !== text) return;
    editor.commands.setTextSelection(pos + 1);
    found = true;
    return false;
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
    const listItem = editor.getJSON().content?.[0] as JsonNode | undefined;
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

  it("splits only the current list item when nested under listItem", () => {
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
                  type: "orderedList",
                  content: [
                    {
                      type: "listItem",
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "first" }],
                        },
                      ],
                    },
                    {
                      type: "listItem",
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "second" }],
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
    selectText(editor, "second");

    expect(convertListItemToSiblingListType(editor, "bulletList")).toBe(true);

    const parentItem = editor.getJSON().content?.[0]?.content?.[0] as
      | JsonNode
      | undefined;
    expect(parentItem?.content?.map((child) => child.type)).toEqual([
      "paragraph",
      "orderedList",
      "bulletList",
    ]);
    expect(
      parentItem?.content?.[1]?.content?.[0]?.content?.[0]?.content?.[0]?.text,
    ).toBe("first");
    expect(
      parentItem?.content?.[2]?.content?.[0]?.content?.[0]?.content?.[0]?.text,
    ).toBe("second");
    expect(getActiveListType(editor)).toBe("bulletList");
  });

  it("converts a single top-level ordered item to bullet", () => {
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
                  content: [{ type: "text", text: "only" }],
                },
              ],
            },
          ],
        },
      ],
    });
    selectText(editor, "only");

    expect(applyListType(editor, "bulletList")).toBe(true);
    expect(editor.getJSON().content?.[0]?.type).toBe("bulletList");
    expect(getActiveListType(editor)).toBe("bulletList");
  });

  it("keeps the first top-level ordered item when converting the second", () => {
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

    expect(applyListType(editor, "bulletList")).toBe(true);
    expect(editor.getJSON().content?.[0]?.type).toBe("orderedList");
    expect(hasMixedListNesting(editor.state.doc)).toBe(true);
    expect(getActiveListType(editor)).toBe("bulletList");
  });

  it("keeps the first top-level ordered item when it already has nested children", () => {
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
                {
                  type: "bulletList",
                  content: [
                    {
                      type: "listItem",
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "nested" }],
                        },
                      ],
                    },
                  ],
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

    expect(applyListType(editor, "bulletList")).toBe(true);
    expect(editor.getJSON().content?.[0]?.type).toBe("orderedList");
    expect(
      editor.getJSON().content?.[0]?.content?.[0]?.content?.[0]?.content?.[0]
        ?.text,
    ).toBe("one");
    expect(hasMixedListNesting(editor.state.doc)).toBe(true);
    expect(getActiveListType(editor)).toBe("bulletList");
  });

  it("converts empty nested ordered item to bullet via applyListType", () => {
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
                  content: [{ type: "text", text: "ddd" }],
                },
                {
                  type: "orderedList",
                  content: [
                    {
                      type: "listItem",
                      content: [{ type: "paragraph" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    let nestedPos = 0;
    const activeEditor = editor;
    activeEditor.state.doc.descendants((node, pos) => {
      if (node.type.name !== "paragraph" || node.textContent !== "") return;
      const $pos = activeEditor.state.doc.resolve(pos + 1);
      if (findInnermostList($pos)) {
        nestedPos = pos + 1;
        return false;
      }
    });
    editor.commands.setTextSelection(nestedPos);

    expect(applyListType(editor, "bulletList")).toBe(true);
    const parentItem = editor.getJSON().content?.[0]?.content?.[0] as
      | JsonNode
      | undefined;
    expect(parentItem?.content?.map((child) => child.type)).toEqual([
      "paragraph",
      "bulletList",
    ]);
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
    expect(hasMixedListNesting(editor.state.doc)).toBe(false);
  });
});
