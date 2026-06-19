export type BlockNoteListItemType = "bulletListItem" | "numberedListItem";

export type BlockNoteMarkerEditor = {
  getParentBlock: (blockId: string) => { id: string; type: string } | undefined;
};

const MARKER_STYLE_ID = "ssota-blocknote-list-markers";

export function indexToAlpha(index: number): string {
  let n = index;
  let result = "";
  while (n > 0) {
    n -= 1;
    result = String.fromCharCode(97 + (n % 26)) + result;
    n = Math.floor(n / 26);
  }
  return result || "a";
}

export function indexToRoman(index: number): string {
  const values: ReadonlyArray<readonly [number, string]> = [
    [1000, "m"],
    [900, "cm"],
    [500, "d"],
    [400, "cd"],
    [100, "c"],
    [90, "xc"],
    [50, "l"],
    [40, "xl"],
    [10, "x"],
    [9, "ix"],
    [5, "v"],
    [4, "iv"],
    [1, "i"],
  ];

  let n = index;
  let result = "";
  for (const [value, numeral] of values) {
    while (n >= value) {
      result += numeral;
      n -= value;
    }
  }
  return result || "i";
}

export function listItemNestingDepth(
  element: HTMLElement,
  listType: BlockNoteListItemType,
): number {
  if (element.getAttribute("data-content-type") !== listType) {
    return 0;
  }

  let depth = 0;
  let blockOuter = element.closest(".bn-block-outer");

  while (blockOuter) {
    const parentGroup = blockOuter.parentElement;
    if (!parentGroup?.classList.contains("bn-block-group")) {
      break;
    }

    const parentBlock = parentGroup.parentElement;
    if (!parentBlock?.classList.contains("bn-block")) {
      break;
    }

    const ancestorOuter = parentBlock.parentElement;
    if (!ancestorOuter?.classList.contains("bn-block-outer")) {
      break;
    }

    const ancestorList = ancestorOuter.querySelector(
      `:scope > .bn-block > .bn-block-content[data-content-type="${listType}"]`,
    );
    if (ancestorList) {
      depth += 1;
    }

    blockOuter = ancestorOuter;
  }

  return depth;
}

export function listItemNestingDepthFromDocument(
  editor: BlockNoteMarkerEditor,
  blockId: string,
  listType: BlockNoteListItemType,
): number {
  let depth = 0;
  let parent = editor.getParentBlock(blockId);

  while (parent) {
    if (parent.type === listType) {
      depth += 1;
    }
    parent = editor.getParentBlock(parent.id);
  }

  return depth;
}

export function numberedListNestingDepth(element: HTMLElement): number {
  return listItemNestingDepth(element, "numberedListItem");
}

export function bulletListNestingDepth(element: HTMLElement): number {
  return listItemNestingDepth(element, "bulletListItem");
}

/** Top level stays decimal; nested levels cycle a. → i. → 1. */
export function formatNumberedListMarker(index: number, depth: number): string {
  if (depth <= 0) {
    return `${index}.`;
  }

  const cycle = (depth - 1) % 3;
  if (cycle === 0) {
    return `${indexToAlpha(index)}.`;
  }
  if (cycle === 1) {
    return `${indexToRoman(index)}.`;
  }
  return `${index}.`;
}

/** Bullet markers cycle • → ◦ → ▪ every three nesting depths. */
export function formatBulletListMarker(depth: number): string {
  const cycle = depth % 3;
  if (cycle === 0) {
    return "•";
  }
  if (cycle === 1) {
    return "◦";
  }
  return "▪\uFE0E";
}

function getBlockId(element: HTMLElement): string | null {
  return element.closest(".bn-block")?.getAttribute("data-id") ?? null;
}

function resolveListDepth(
  element: HTMLElement,
  listType: BlockNoteListItemType,
  editor?: BlockNoteMarkerEditor,
): number {
  const blockId = getBlockId(element);
  if (editor && blockId) {
    return listItemNestingDepthFromDocument(editor, blockId, listType);
  }
  return listItemNestingDepth(element, listType);
}

function cssContent(value: string): string {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function numberedMarkerSelectors(blockId: string): string {
  return [
    `.blocknote-editor-shell .bn-block[data-id="${blockId}"] > .bn-block-content[data-content-type="numberedListItem"]::before`,
    `.blocknote-editor-shell .bn-block[data-id="${blockId}"] > div[data-type="modification"] > .bn-block-content[data-content-type="numberedListItem"]::before`,
    `.blocknote-editor-shell .bn-block-outer[data-prev-type="numberedListItem"] .bn-block[data-id="${blockId}"] > .bn-block-content[data-content-type="numberedListItem"]::before`,
  ].join(",\n");
}

function bulletMarkerSelectors(blockId: string): string {
  return [
    `.blocknote-editor-shell .bn-block[data-id="${blockId}"] > .bn-block-content[data-content-type="bulletListItem"]::before`,
    `.blocknote-editor-shell .bn-block[data-id="${blockId}"] > div[data-type="modification"] > .bn-block-content[data-content-type="bulletListItem"]::before`,
    `.blocknote-editor-shell .bn-block-outer[data-prev-type="bulletListItem"] .bn-block[data-id="${blockId}"] > .bn-block-content[data-content-type="bulletListItem"]::before`,
  ].join(",\n");
}

function appendMarkerRule(
  rules: string[],
  selectors: string,
  marker: string,
): void {
  rules.push(`${selectors} { content: ${cssContent(marker)} !important; }`);
}

function updateNumberedListMarkers(
  shell: HTMLElement,
  editor: BlockNoteMarkerEditor | undefined,
  rules: string[],
): void {
  const numberedItems = shell.querySelectorAll<HTMLElement>(
    '[data-content-type="numberedListItem"]',
  );

  for (const item of numberedItems) {
    const blockId = getBlockId(item);
    if (!blockId) {
      continue;
    }

    const index = Number.parseInt(item.getAttribute("data-index") ?? "1", 10);
    const depth = resolveListDepth(item, "numberedListItem", editor);
    const marker = formatNumberedListMarker(index, depth);
    appendMarkerRule(rules, numberedMarkerSelectors(blockId), marker);
    item.setAttribute("data-marker", marker);
  }

  const prevItems = shell.querySelectorAll<HTMLElement>(
    '.bn-block-outer[data-prev-type="numberedListItem"]:not([data-prev-index="none"]) > .bn-block > .bn-block-content[data-content-type="numberedListItem"]',
  );

  for (const item of prevItems) {
    const blockId = getBlockId(item);
    if (!blockId) {
      continue;
    }

    const outer = item.closest(".bn-block-outer");
    const prevIndex = Number.parseInt(
      outer?.getAttribute("data-prev-index") ?? "1",
      10,
    );
    const depth = resolveListDepth(item, "numberedListItem", editor);
    const marker = formatNumberedListMarker(prevIndex, depth);
    appendMarkerRule(rules, numberedMarkerSelectors(blockId), marker);
    item.setAttribute("data-marker-prev", marker);
  }
}

function updateBulletListMarkers(
  shell: HTMLElement,
  editor: BlockNoteMarkerEditor | undefined,
  rules: string[],
): void {
  const bulletItems = shell.querySelectorAll<HTMLElement>(
    '[data-content-type="bulletListItem"]',
  );

  for (const item of bulletItems) {
    const blockId = getBlockId(item);
    if (!blockId) {
      continue;
    }

    const depth = resolveListDepth(item, "bulletListItem", editor);
    const marker = formatBulletListMarker(depth);
    appendMarkerRule(rules, bulletMarkerSelectors(blockId), marker);
    item.setAttribute("data-marker", marker);
  }

  const prevItems = shell.querySelectorAll<HTMLElement>(
    '.bn-block-outer[data-prev-type="bulletListItem"]:not([data-prev-index="none"]) > .bn-block > .bn-block-content[data-content-type="bulletListItem"]',
  );

  for (const item of prevItems) {
    const blockId = getBlockId(item);
    if (!blockId) {
      continue;
    }

    const depth = resolveListDepth(item, "bulletListItem", editor);
    const marker = formatBulletListMarker(depth);
    appendMarkerRule(rules, bulletMarkerSelectors(blockId), marker);
    item.setAttribute("data-marker-prev", marker);
  }
}

function ensureMarkerStyleElement(shell: HTMLElement): HTMLStyleElement {
  const existing = shell.querySelector<HTMLStyleElement>(`#${MARKER_STYLE_ID}`);
  if (existing) {
    return existing;
  }

  const style = document.createElement("style");
  style.id = MARKER_STYLE_ID;
  shell.appendChild(style);
  return style;
}

export function updateBlockNoteListMarkers(
  shell: HTMLElement,
  editor?: BlockNoteMarkerEditor,
): void {
  const rules: string[] = [];
  updateNumberedListMarkers(shell, editor, rules);
  updateBulletListMarkers(shell, editor, rules);
  ensureMarkerStyleElement(shell).textContent = rules.join("\n");
}

/** @deprecated Use updateBlockNoteListMarkers */
export function updateBlockNoteNumberedListMarkers(shell: HTMLElement): void {
  updateBlockNoteListMarkers(shell);
}

export function resolveBlockNoteMarkerShell(
  shellRef: { current: HTMLDivElement | null },
): HTMLElement | null {
  return (
    shellRef.current ??
    (typeof document === "undefined"
      ? null
      : document.querySelector<HTMLElement>(
          ".blocknote-editor-shell[data-testid='blocknote-editor-shell']",
        ))
  );
}
