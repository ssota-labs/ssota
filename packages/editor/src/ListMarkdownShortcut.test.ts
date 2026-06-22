import { Editor } from "@tiptap/core";
import { ListKeymap } from "@tiptap/extension-list";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";
import { ListMarkdownShortcut } from "./extensions/ListMarkdownShortcut";
import {
  MixedBulletList,
  MixedOrderedList,
} from "./extensions/mixed-list-extensions";
import { NestedListItem } from "./extensions/NestedListItem";
import { getActiveListType, hasMixedListNesting, findInnermostList } from "./list-commands";
import { parseListMarkerBeforeSpace } from "./list-marker-utils";

type JsonNode = {
  type?: string;
  content?: JsonNode[];
  text?: string;
};

const editors: Editor[] = [];

function createEditor(content?: object) {
  const element = document.createElement("div");
  document.body.appendChild(element);

  const editor = new Editor({
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
      ListMarkdownShortcut,
    ],
    content,
  });
  editors.push(editor);
  return editor;
}

afterEach(() => {
  while (editors.length > 0) {
    editors.pop()?.destroy();
  }
});

function selectParagraphStart(editor: Editor, text: string) {
  let found = false;
  editor.state.doc.descendants((node, pos) => {
    if (found || !node.isTextblock || node.textContent !== text) return;
    editor.commands.setTextSelection(pos + 1);
    found = true;
    return false;
  });
  expect(found).toBe(true);
}

function triggerListMarkerShortcut(editor: Editor, markerBeforeSpace: string) {
  const marker = parseListMarkerBeforeSpace(markerBeforeSpace);
  expect(marker).not.toBeNull();

  const { view } = editor;
  const $from = editor.state.selection.$from;
  const blockStart = $from.start();

  view.dispatch(editor.state.tr.insertText(markerBeforeSpace, blockStart, blockStart));

  const from = blockStart + markerBeforeSpace.length;
  let handled = false;
  view.someProp("handleTextInput", (handler) => {
    // prosemirror-view 1.41+ adds a 5th `deflt: () => Transaction` parameter.
    if (handler(view, from, from, " ", () => editor.state.tr)) {
      handled = true;
      return true;
    }
    return false;
  });
  expect(handled).toBe(true);
}

function selectNestedListParagraph(editor: Editor) {
  let found = false;
  editor.state.doc.descendants((node, pos) => {
    if (found || node.type.name !== "paragraph") {
      return;
    }

    const $pos = editor.state.doc.resolve(pos + 1);
    const innermost = findInnermostList($pos);
    if (!innermost || !isListNestedInListItem($pos, innermost)) {
      return;
    }

    editor.commands.setTextSelection(pos + 1);
    found = true;
    return false;
  });
  expect(found).toBe(true);
}

function isListNestedInListItem(
  $from: ReturnType<Editor["state"]["doc"]["resolve"]>,
  innermost: { depth: number },
): boolean {
  const parentDepth = innermost.depth - 1;
  if (parentDepth <= 0) {
    return false;
  }
  return $from.node(parentDepth).type.name === "listItem";
}

function topLevelListItemCount(editor: Editor): number {
  const topList = editor.getJSON().content?.[0] as JsonNode | undefined;
  return topList?.content?.length ?? 0;
}

describe("ListMarkdownShortcut integration", () => {
  it("keeps the first top-level ordered item when the second uses asterisk shortcut", () => {
    const editor = createEditor({
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

    selectParagraphStart(editor, "two");
    triggerListMarkerShortcut(editor, "*");

    expect(editor.getJSON().content?.[0]?.type).toBe("orderedList");
    expect(hasMixedListNesting(editor.state.doc)).toBe(true);
    expect(getActiveListType(editor)).toBe("bulletList");
  });

  it("converts a sibling level-2 bullet list with a. shortcut", () => {
    const editor = createEditor({
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
                          content: [{ type: "text", text: "bullet child" }],
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

    selectParagraphStart(editor, "bullet child");
    triggerListMarkerShortcut(editor, "a.");

    const parentItem = editor.getJSON().content?.[0]?.content?.[0] as
      | JsonNode
      | undefined;
    expect(parentItem?.content?.map((child) => child.type)).toEqual([
      "paragraph",
      "orderedList",
    ]);
    expect(getActiveListType(editor)).toBe("orderedList");
  });

  it("converts a sibling level-2 bullet list with 1. shortcut", () => {
    const editor = createEditor({
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
                          content: [{ type: "text", text: "bullet child" }],
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

    selectParagraphStart(editor, "bullet child");
    triggerListMarkerShortcut(editor, "1.");

    expect(getActiveListType(editor)).toBe("orderedList");
  });

  it("converts the third sibling bullet at level 2 with a. shortcut", () => {
    const editor = createEditor({
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
                          content: [{ type: "text", text: "bullet one" }],
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "orderedList",
                  content: [
                    {
                      type: "listItem",
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "ordered one" }],
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "bulletList",
                  content: [
                    {
                      type: "listItem",
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "bullet two" }],
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

    selectParagraphStart(editor, "bullet two");
    triggerListMarkerShortcut(editor, "a.");

    const parentItem = editor.getJSON().content?.[0]?.content?.[0] as
      | JsonNode
      | undefined;
    expect(parentItem?.content?.map((child) => child.type)).toEqual([
      "paragraph",
      "bulletList",
      "orderedList",
      "orderedList",
    ]);
    expect(getActiveListType(editor)).toBe("orderedList");
  });

  it("creates ordered list from empty nested line with a. shortcut", () => {
    const editor = createEditor({
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
              ],
            },
          ],
        },
      ],
    });

    selectParagraphStart(editor, "parent");
    editor.commands.setTextSelection(editor.state.selection.to);
    editor.commands.splitListItem("listItem");
    editor.commands.sinkListItem("listItem");

    triggerListMarkerShortcut(editor, "a.");

    expect(getActiveListType(editor)).toBe("orderedList");
  });

  it("converts nested a. to bullet in place when typing asterisk on the parent paragraph", () => {
    const editor = createEditor({
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
          ],
        },
      ],
    });

    selectParagraphStart(editor, "ddd");
    triggerListMarkerShortcut(editor, "*");

    const parentItem = editor.getJSON().content?.[0]?.content?.[0] as
      | JsonNode
      | undefined;
    expect(parentItem?.content?.map((child) => child.type)).toEqual([
      "paragraph",
      "bulletList",
    ]);
    expect(
      parentItem?.content?.[1]?.content?.[0]?.content?.[0]?.content?.[0]?.text,
    ).toBe("nested");
    expect(getActiveListType(editor)).toBe("bulletList");
    expect(topLevelListItemCount(editor)).toBe(1);
  });

  it("reproduces full typing flow: 1. ddd → nest → a. → * stays at level 2", () => {
    const editor = createEditor({
      type: "doc",
      content: [{ type: "paragraph" }],
    });

    triggerListMarkerShortcut(editor, "1.");
    editor.commands.insertContent("ddd");
    editor.commands.setTextSelection(editor.state.selection.to);
    editor.commands.splitListItem("listItem");
    editor.commands.sinkListItem("listItem");
    triggerListMarkerShortcut(editor, "a.");
    selectNestedListParagraph(editor);
    triggerListMarkerShortcut(editor, "*");

    const parentItem = editor.getJSON().content?.[0]?.content?.[0] as
      | JsonNode
      | undefined;
    expect(parentItem?.content?.map((child) => child.type)).toEqual([
      "paragraph",
      "bulletList",
    ]);
    expect(topLevelListItemCount(editor)).toBe(1);
    expect(getActiveListType(editor)).toBe("bulletList");
  });

  it("stays at level 2 after converting a. line to bullet and pressing Enter", () => {
    const editor = createEditor({
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
          ],
        },
      ],
    });

    selectParagraphStart(editor, "nested");
    triggerListMarkerShortcut(editor, "*");
    expect(getActiveListType(editor)).toBe("bulletList");
    expect(topLevelListItemCount(editor)).toBe(1);

    editor.commands.splitListItem("listItem");

    expect(topLevelListItemCount(editor)).toBe(1);
    expect(getActiveListType(editor)).toBe("bulletList");

    triggerListMarkerShortcut(editor, "*");
    expect(topLevelListItemCount(editor)).toBe(1);
    expect(getActiveListType(editor)).toBe("bulletList");
  });
});
