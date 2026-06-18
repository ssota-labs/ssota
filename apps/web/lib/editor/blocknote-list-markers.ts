export type BlockNoteListItemType = "bulletListItem" | "numberedListItem";

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

function updateNumberedListMarkers(shell: HTMLElement): void {
  const numberedItems = shell.querySelectorAll<HTMLElement>(
    '[data-content-type="numberedListItem"]',
  );

  for (const item of numberedItems) {
    const index = Number.parseInt(item.getAttribute("data-index") ?? "1", 10);
    const depth = numberedListNestingDepth(item);
    const marker = formatNumberedListMarker(index, depth);
    if (item.getAttribute("data-marker") !== marker) {
      item.setAttribute("data-marker", marker);
    }
  }

  const prevItems = shell.querySelectorAll<HTMLElement>(
    '.bn-block-outer[data-prev-type="numberedListItem"]:not([data-prev-index="none"]) > .bn-block > .bn-block-content[data-content-type="numberedListItem"]',
  );

  for (const item of prevItems) {
    const outer = item.closest(".bn-block-outer");
    const prevIndex = Number.parseInt(
      outer?.getAttribute("data-prev-index") ?? "1",
      10,
    );
    const depth = numberedListNestingDepth(item);
    const marker = formatNumberedListMarker(prevIndex, depth);
    if (item.getAttribute("data-marker-prev") !== marker) {
      item.setAttribute("data-marker-prev", marker);
    }
  }
}

function updateBulletListMarkers(shell: HTMLElement): void {
  const bulletItems = shell.querySelectorAll<HTMLElement>(
    '[data-content-type="bulletListItem"]',
  );

  for (const item of bulletItems) {
    const depth = bulletListNestingDepth(item);
    const marker = formatBulletListMarker(depth);
    if (item.getAttribute("data-marker") !== marker) {
      item.setAttribute("data-marker", marker);
    }
  }

  const prevItems = shell.querySelectorAll<HTMLElement>(
    '.bn-block-outer[data-prev-type="bulletListItem"]:not([data-prev-index="none"]) > .bn-block > .bn-block-content[data-content-type="bulletListItem"]',
  );

  for (const item of prevItems) {
    const depth = bulletListNestingDepth(item);
    const marker = formatBulletListMarker(depth);
    if (item.getAttribute("data-marker-prev") !== marker) {
      item.setAttribute("data-marker-prev", marker);
    }
  }
}

export function updateBlockNoteListMarkers(shell: HTMLElement): void {
  updateNumberedListMarkers(shell);
  updateBulletListMarkers(shell);
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
