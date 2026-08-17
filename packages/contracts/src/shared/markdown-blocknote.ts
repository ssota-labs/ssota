import type { BlockNoteContent } from "../agents/workflow-instruction.js";

/**
 * Markdown ↔ BlockNote conversion for graph node content.
 *
 * Agents author node `content` as markdown (via MCP / agent-runtime tools), but
 * the web app renders node content through a BlockNote editor that expects a
 * BlockNote document (array of blocks) — a raw markdown string would render as
 * a single literal-text paragraph. We normalize markdown → BlockNote on write
 * so it renders richly, and convert BlockNote → markdown on read so agents keep
 * seeing markdown.
 *
 * This is a focused, dependency-free converter covering the subset agents emit:
 * headings, paragraphs, bullet/numbered lists (nested), GFM tables, and inline
 * bold/italic/code/links. Unsupported constructs degrade to paragraphs rather
 * than throwing — node reads/writes must never crash on odd input.
 */

type InlineStyles = { bold?: true; italic?: true; code?: true };

interface TextInline {
  type: "text";
  text: string;
  styles: InlineStyles;
}

interface LinkInline {
  type: "link";
  href: string;
  content: TextInline[];
}

type Inline = TextInline | LinkInline;

type Block = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Inline parsing (markdown → BlockNote inline content)
// ---------------------------------------------------------------------------

interface InlineRule {
  re: RegExp;
  make: (m: RegExpExecArray) => Inline;
}

// Order matters: code spans and links are unambiguous; **bold** before *italic*.
const INLINE_RULES: InlineRule[] = [
  { re: /`([^`]+)`/, make: (m) => ({ type: "text", text: m[1] ?? "", styles: { code: true } }) },
  {
    re: /\[([^\]]+)\]\(([^)\s]+)\)/,
    make: (m) => ({
      type: "link",
      href: m[2] ?? "",
      content: [{ type: "text", text: m[1] ?? "", styles: {} }],
    }),
  },
  { re: /\*\*([^*]+)\*\*/, make: (m) => ({ type: "text", text: m[1] ?? "", styles: { bold: true } }) },
  { re: /__([^_]+)__/, make: (m) => ({ type: "text", text: m[1] ?? "", styles: { bold: true } }) },
  { re: /\*([^*]+)\*/, make: (m) => ({ type: "text", text: m[1] ?? "", styles: { italic: true } }) },
];

/** Parse a single line of inline markdown into BlockNote inline content. */
export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  const pushPlain = (t: string) => {
    if (t) out.push({ type: "text", text: t, styles: {} });
  };

  let rest = text;
  while (rest.length > 0) {
    let best: { index: number; length: number; node: Inline } | null = null;
    for (const rule of INLINE_RULES) {
      const m = rule.re.exec(rest);
      if (m && (best === null || m.index < best.index)) {
        best = { index: m.index, length: m[0].length, node: rule.make(m) };
      }
    }
    if (!best) {
      pushPlain(rest);
      break;
    }
    if (best.index > 0) pushPlain(rest.slice(0, best.index));
    out.push(best.node);
    rest = rest.slice(best.index + best.length);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Block parsing (markdown → BlockNote document)
// ---------------------------------------------------------------------------

const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const HR_RE = /^([-*_])\1{2,}$/;
const LIST_RE = /^(\s*)([-*+]|\d+\.)\s+(.*)$/;
const BLOCKQUOTE_RE = /^>\s?(.*)$/;

function buildTable(rowLines: string[]): Block {
  const splitRow = (line: string): string[] =>
    line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim());

  const rows = rowLines.map((line, rowIndex) => {
    const cells = splitRow(line).map((cellText) => {
      const inline = parseInline(cellText);
      // Bold the header row for readability (no native header style in 0.51).
      if (rowIndex === 0) {
        for (const node of inline) {
          if (node.type === "text") node.styles = { ...node.styles, bold: true };
        }
      }
      return inline;
    });
    return { cells };
  });

  return { type: "table", content: { type: "tableContent", rows } };
}

function indentOf(line: string): number {
  const m = LIST_RE.exec(line);
  return m ? (m[1] ?? "").length : 0;
}

function parseList(
  lines: string[],
  start: number,
): { items: Block[]; next: number } {
  const items: Block[] = [];
  const baseIndent = indentOf(lines[start] ?? "");
  let i = start;

  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (line.trim() === "") break;
    const m = LIST_RE.exec(line);
    if (!m) break;
    const indent = (m[1] ?? "").length;
    if (indent < baseIndent) break;
    if (indent > baseIndent) {
      const nested = parseList(lines, i);
      const parent = items[items.length - 1];
      if (parent) {
        const children = (parent.children as Block[] | undefined) ?? [];
        children.push(...nested.items);
        parent.children = children;
      }
      i = nested.next;
      continue;
    }
    const marker = m[2] ?? "-";
    const ordered = /\d+\./.test(marker);
    items.push({
      type: ordered ? "numberedListItem" : "bulletListItem",
      content: parseInline((m[3] ?? "").trim()),
    });
    i += 1;
  }
  return { items, next: i };
}

/** Convert a markdown string into a BlockNote document (array of blocks). */
export function markdownToBlockNoteContent(markdown: string): BlockNoteContent {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const text = paragraph.join(" ").trim();
    if (text) blocks.push({ type: "paragraph", content: parseInline(text) });
    paragraph = [];
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();

    if (trimmed === "") {
      flushParagraph();
      i += 1;
      continue;
    }

    const heading = HEADING_RE.exec(trimmed);
    if (heading) {
      flushParagraph();
      const level = Math.min((heading[1] ?? "#").length, 3);
      blocks.push({
        type: "heading",
        props: { level },
        content: parseInline((heading[2] ?? "").trim()),
      });
      i += 1;
      continue;
    }

    // Standalone horizontal rule — no default BlockNote block, drop it.
    if (HR_RE.test(trimmed)) {
      flushParagraph();
      i += 1;
      continue;
    }

    // GFM table: a row containing "|" followed by a separator row of dashes.
    const next = (lines[i + 1] ?? "").trim();
    if (trimmed.includes("|") && /^\|?[\s:|-]+\|?$/.test(next) && next.includes("-")) {
      flushParagraph();
      const rowLines: string[] = [trimmed];
      i += 2; // skip header + separator
      while (i < lines.length) {
        const bodyLine = lines[i] ?? "";
        if (!bodyLine.includes("|") || bodyLine.trim() === "") break;
        rowLines.push(bodyLine);
        i += 1;
      }
      blocks.push(buildTable(rowLines));
      continue;
    }

    if (LIST_RE.test(line)) {
      flushParagraph();
      const { items, next: listNext } = parseList(lines, i);
      blocks.push(...items);
      i = listNext;
      continue;
    }

    const quote = BLOCKQUOTE_RE.exec(trimmed);
    if (quote) {
      // No guaranteed quote block in the default schema — fold into a paragraph.
      paragraph.push(quote[1] ?? "");
      i += 1;
      continue;
    }

    paragraph.push(trimmed);
    i += 1;
  }
  flushParagraph();

  return blocks as BlockNoteContent;
}

// ---------------------------------------------------------------------------
// Reverse: BlockNote document → markdown (for agent reads)
// ---------------------------------------------------------------------------

function inlineToMarkdown(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((node) => {
      if (!node || typeof node !== "object") return "";
      const n = node as Record<string, unknown>;
      if (n.type === "link") {
        const href = typeof n.href === "string" ? n.href : "";
        return `[${inlineToMarkdown(n.content)}](${href})`;
      }
      const text = typeof n.text === "string" ? n.text : "";
      const styles = (n.styles as InlineStyles | undefined) ?? {};
      if (styles.code) return `\`${text}\``;
      let out = text;
      if (styles.bold) out = `**${out}**`;
      if (styles.italic) out = `*${out}*`;
      return out;
    })
    .join("");
}

function cellToMarkdown(cell: unknown): string {
  // Cell may be an inline array (older/partial) or a { content } object (newer).
  if (Array.isArray(cell)) return inlineToMarkdown(cell);
  if (cell && typeof cell === "object" && "content" in cell) {
    return inlineToMarkdown((cell as Record<string, unknown>).content);
  }
  return inlineToMarkdown(cell);
}

function tableToMarkdown(content: unknown): string {
  const rows =
    content && typeof content === "object" && Array.isArray((content as Record<string, unknown>).rows)
      ? ((content as Record<string, unknown>).rows as Record<string, unknown>[])
      : [];
  if (rows.length === 0) return "";
  const renderRow = (cells: unknown[]) => `| ${cells.map(cellToMarkdown).join(" | ")} |`;
  const lines: string[] = [];
  rows.forEach((row, index) => {
    const cells = Array.isArray(row.cells) ? (row.cells as unknown[]) : [];
    lines.push(renderRow(cells));
    if (index === 0) lines.push(`| ${cells.map(() => "---").join(" | ")} |`);
  });
  return lines.join("\n");
}

function blockToMarkdown(block: Record<string, unknown>, depth = 0): string {
  const type = block.type;
  const content = block.content;
  const children = Array.isArray(block.children) ? (block.children as Record<string, unknown>[]) : [];

  const renderChildren = (childDepth: number) =>
    children.map((c) => blockToMarkdown(c, childDepth)).filter(Boolean);

  switch (type) {
    case "heading": {
      const level = Number((block.props as Record<string, unknown> | undefined)?.level ?? 1);
      return `${"#".repeat(Math.min(Math.max(level, 1), 6))} ${inlineToMarkdown(content)}`;
    }
    case "bulletListItem":
    case "numberedListItem": {
      const marker = type === "numberedListItem" ? "1." : "-";
      const indent = "  ".repeat(depth);
      const head = `${indent}${marker} ${inlineToMarkdown(content)}`;
      const nested = renderChildren(depth + 1);
      return nested.length > 0 ? [head, ...nested].join("\n") : head;
    }
    case "table":
      return tableToMarkdown(content);
    case "codeBlock": {
      const lang = (block.props as Record<string, unknown> | undefined)?.language ?? "";
      return `\`\`\`${lang}\n${inlineToMarkdown(content)}\n\`\`\``;
    }
    case "quote":
      return `> ${inlineToMarkdown(content)}`;
    default:
      return inlineToMarkdown(content);
  }
}

/** Convert a BlockNote document into markdown. Defensive: never throws. */
export function blockNoteContentToMarkdown(content: BlockNoteContent): string {
  try {
    if (!Array.isArray(content)) return "";
    const blocks = content as Record<string, unknown>[];
    const out: string[] = [];
    let i = 0;
    while (i < blocks.length) {
      const block = blocks[i];
      if (!block) {
        i += 1;
        continue;
      }
      const type = block.type;
      // Group consecutive list items without blank lines between them.
      if (type === "bulletListItem" || type === "numberedListItem") {
        const group: string[] = [];
        while (i < blocks.length) {
          const b = blocks[i];
          if (!b || (b.type !== "bulletListItem" && b.type !== "numberedListItem")) break;
          group.push(blockToMarkdown(b));
          i += 1;
        }
        out.push(group.join("\n"));
        continue;
      }
      out.push(blockToMarkdown(block));
      i += 1;
    }
    return out.filter((s) => s.length > 0).join("\n\n");
  } catch {
    return "";
  }
}

/**
 * Normalize a node's stored content for the agent-facing read path: BlockNote
 * documents become markdown, strings pass through unchanged.
 */
export function nodeContentToMarkdown(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return blockNoteContentToMarkdown(value as BlockNoteContent);
  return JSON.stringify(value);
}

/**
 * Normalize a node's content for the write path: a markdown string becomes a
 * BlockNote document; an already-BlockNote array (e.g. saved by the web editor)
 * is passed through untouched. Non-string/array values are returned as-is.
 */
export function normalizeNodeContentForWrite(value: unknown): unknown {
  if (typeof value !== "string") return value;
  if (value.trim().length === 0) return [];
  return markdownToBlockNoteContent(value);
}

const STRUCTURED_BLOCK_TYPES = new Set([
  "heading",
  "bulletListItem",
  "numberedListItem",
  "table",
  "blockquote",
  "quote",
  "codeBlock",
]);

function hasStructuredBlocks(content: BlockNoteContent): boolean {
  return content.some((block) => {
    const type = block.type;
    return typeof type === "string" && STRUCTURED_BLOCK_TYPES.has(type);
  });
}

const MARKDOWN_SIGNAL_RE =
  /(^|\n)(#{1,6}\s|[-*+]\s|\d+\.\s|\|[^\n]+\|)|\*\*[^*\n]+\*\*/;

function looksLikeMarkdownDocument(text: string): boolean {
  return MARKDOWN_SIGNAL_RE.test(text);
}

/**
 * Workflow instructions are often stored as markdown (registry bodies, legacy DB
 * migration) wrapped in plain paragraph blocks. Convert to a real BlockNote doc
 * for the web editor without re-processing content the user already saved as
 * structured blocks.
 */
export function normalizeWorkflowInstructionContent(
  content: BlockNoteContent,
): BlockNoteContent {
  if (!Array.isArray(content) || content.length === 0) return content;
  if (hasStructuredBlocks(content)) return content;

  const markdown = blockNoteContentToMarkdown(content);
  if (!markdown.trim() || !looksLikeMarkdownDocument(markdown)) return content;

  return markdownToBlockNoteContent(markdown);
}
