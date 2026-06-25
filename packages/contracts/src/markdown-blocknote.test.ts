import { describe, expect, it } from "vitest";
import {
  blockNoteContentToMarkdown,
  markdownToBlockNoteContent,
  nodeContentToMarkdown,
  normalizeNodeContentForWrite,
  normalizeWorkflowInstructionContent,
  parseInline,
} from "./markdown-blocknote.js";

describe("parseInline", () => {
  it("parses bold, italic, code, and links", () => {
    expect(parseInline("**b** *i* `c` [t](https://x.io)")).toEqual([
      { type: "text", text: "b", styles: { bold: true } },
      { type: "text", text: " ", styles: {} },
      { type: "text", text: "i", styles: { italic: true } },
      { type: "text", text: " ", styles: {} },
      { type: "text", text: "c", styles: { code: true } },
      { type: "text", text: " ", styles: {} },
      { type: "link", href: "https://x.io", content: [{ type: "text", text: "t", styles: {} }] },
    ]);
  });

  it("treats plain text as a single node", () => {
    expect(parseInline("just text")).toEqual([
      { type: "text", text: "just text", styles: {} },
    ]);
  });
});

describe("markdownToBlockNoteContent", () => {
  it("converts headings (clamped to level 3)", () => {
    expect(markdownToBlockNoteContent("## Vision")).toEqual([
      { type: "heading", props: { level: 2 }, content: [{ type: "text", text: "Vision", styles: {} }] },
    ]);
    const deep = markdownToBlockNoteContent("##### Deep")[0] as Record<string, unknown>;
    expect((deep.props as Record<string, unknown>).level).toBe(3);
  });

  it("converts a paragraph with inline styles", () => {
    expect(markdownToBlockNoteContent("hello **world**")).toEqual([
      {
        type: "paragraph",
        content: [
          { type: "text", text: "hello ", styles: {} },
          { type: "text", text: "world", styles: { bold: true } },
        ],
      },
    ]);
  });

  it("converts nested bullet lists", () => {
    const blocks = markdownToBlockNoteContent("- a\n- b\n  - b1");
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ type: "bulletListItem" });
    expect(blocks[1]).toMatchObject({
      type: "bulletListItem",
      children: [{ type: "bulletListItem", content: [{ type: "text", text: "b1", styles: {} }] }],
    });
  });

  it("converts numbered lists", () => {
    const blocks = markdownToBlockNoteContent("1. first\n2. second");
    expect(blocks.map((b) => (b as Record<string, unknown>).type)).toEqual([
      "numberedListItem",
      "numberedListItem",
    ]);
  });

  it("converts a GFM table with a bolded header row", () => {
    const blocks = markdownToBlockNoteContent("| A | B |\n|---|---|\n| 1 | 2 |");
    expect(blocks).toHaveLength(1);
    const table = blocks[0] as Record<string, unknown>;
    expect(table.type).toBe("table");
    const content = table.content as { type: string; rows: { cells: unknown[] }[] };
    expect(content.type).toBe("tableContent");
    expect(content.rows).toHaveLength(2);
    expect(content.rows[0]!.cells[0]).toEqual([{ type: "text", text: "A", styles: { bold: true } }]);
    expect(content.rows[1]!.cells[1]).toEqual([{ type: "text", text: "2", styles: {} }]);
  });

  it("drops standalone horizontal rules", () => {
    expect(markdownToBlockNoteContent("---")).toEqual([]);
  });
});

describe("blockNoteContentToMarkdown (round-trip)", () => {
  it("round-trips headings, paragraphs, lists and tables", () => {
    const md = [
      "## Section",
      "",
      "hello **world** and `code`",
      "",
      "- a",
      "- b",
      "",
      "| A | B |",
      "| --- | --- |",
      "| 1 | 2 |",
    ].join("\n");
    const roundTripped = blockNoteContentToMarkdown(markdownToBlockNoteContent(md));
    expect(roundTripped).toContain("## Section");
    expect(roundTripped).toContain("hello **world** and `code`");
    expect(roundTripped).toContain("- a");
    expect(roundTripped).toContain("| **A** | **B** |");
    expect(roundTripped).toContain("| 1 | 2 |");
  });

  it("never throws on malformed input", () => {
    expect(blockNoteContentToMarkdown([{ foo: "bar" } as never])).toBe("");
    expect(blockNoteContentToMarkdown("nope" as never)).toBe("");
  });
});

describe("nodeContentToMarkdown", () => {
  it("passes strings through and converts arrays", () => {
    expect(nodeContentToMarkdown(null)).toBeNull();
    expect(nodeContentToMarkdown(undefined)).toBeNull();
    expect(nodeContentToMarkdown("plain")).toBe("plain");
    expect(nodeContentToMarkdown(markdownToBlockNoteContent("# Title"))).toBe("# Title");
  });
});

describe("normalizeWorkflowInstructionContent", () => {
  it("converts legacy paragraph-wrapped markdown to BlockNote blocks", () => {
    const legacy = [
      {
        type: "paragraph",
        content: [{ type: "text", text: "# Daily\n\n- step one\n- step two" }],
      },
    ];
    const normalized = normalizeWorkflowInstructionContent(legacy);
    expect(normalized.some((b) => b.type === "heading")).toBe(true);
    expect(normalized.some((b) => b.type === "bulletListItem")).toBe(true);
  });

  it("passes through structured BlockNote documents", () => {
    const blocks = markdownToBlockNoteContent("## Already converted");
    expect(normalizeWorkflowInstructionContent(blocks)).toEqual(blocks);
  });

  it("passes through plain paragraph text without markdown signals", () => {
    const plain = [
      {
        type: "paragraph",
        content: [{ type: "text", text: "Just a short note." }],
      },
    ];
    expect(normalizeWorkflowInstructionContent(plain)).toEqual(plain);
  });
});

describe("normalizeNodeContentForWrite", () => {
  it("converts markdown strings to BlockNote, passes arrays through", () => {
    const blocks = markdownToBlockNoteContent("## H");
    expect(normalizeNodeContentForWrite("## H")).toEqual(blocks);
    expect(normalizeNodeContentForWrite(blocks)).toBe(blocks);
    expect(normalizeNodeContentForWrite("")).toEqual([]);
    expect(normalizeNodeContentForWrite(undefined)).toBeUndefined();
  });
});
