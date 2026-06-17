import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";
import { MixedBulletList, MixedOrderedList } from "./extensions/mixed-list-extensions";
import { NestedListItem } from "./extensions/NestedListItem";
import { resolveBlockSelectionDepth } from "./node-range-depth";

const editors: Editor[] = [];

function createListEditor(content: object) {
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

function depthAt(editor: Editor, pos: number) {
  const $pos = editor.state.doc.resolve(pos);
  return resolveBlockSelectionDepth($pos, $pos);
}

describe("resolveBlockSelectionDepth", () => {
  it("uses innermost listItem for nested list lines", () => {
    const editor = createListEditor({
      type: "doc",
      content: [
        {
          type: "orderedList",
          content: [
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "ooo" }] },
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

    let nestedParagraphPos: number | null = null;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "paragraph" && node.textContent === "nested") {
        nestedParagraphPos = pos + 1;
      }
    });
    expect(nestedParagraphPos).not.toBeNull();

    const $nested = editor.state.doc.resolve(nestedParagraphPos!);
    const nestedListItemDepth = (() => {
      for (let d = $nested.depth; d > 0; d -= 1) {
        if ($nested.node(d).type.name === "listItem") return d;
      }
      return null;
    })();

    expect(depthAt(editor, nestedParagraphPos!)).toBe(nestedListItemDepth);

    let topParagraphPos: number | null = null;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "paragraph" && node.textContent === "ooo") {
        topParagraphPos = pos + 1;
      }
    });
    expect(depthAt(editor, topParagraphPos!)).toBe(2);
  });

  it("falls back to default block depth outside lists", () => {
    const editor = createListEditor({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "plain" }],
        },
      ],
    });

    let paragraphPos: number | null = null;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "paragraph" && node.textContent === "plain") {
        paragraphPos = pos + 1;
      }
    });
    expect(paragraphPos).not.toBeNull();

    const $pos = editor.state.doc.resolve(paragraphPos!);
    expect(resolveBlockSelectionDepth($pos, $pos)).toBe(0);
  });
});
