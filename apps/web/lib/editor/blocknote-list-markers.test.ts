import { describe, expect, it } from "vitest";

import {
  formatBulletListMarker,
  formatNumberedListMarker,
  indexToAlpha,
  indexToRoman,
  listItemNestingDepthFromDocument,
} from "./blocknote-list-markers";

describe("blocknote-list-markers", () => {
  it("formats top-level markers as decimal", () => {
    expect(formatNumberedListMarker(1, 0)).toBe("1.");
    expect(formatNumberedListMarker(3, 0)).toBe("3.");
  });

  it("cycles nested markers as a., i., 1.", () => {
    expect(formatNumberedListMarker(1, 1)).toBe("a.");
    expect(formatNumberedListMarker(2, 2)).toBe("ii.");
    expect(formatNumberedListMarker(3, 3)).toBe("3.");
    expect(formatNumberedListMarker(2, 4)).toBe("b.");
    expect(formatNumberedListMarker(3, 5)).toBe("iii.");
  });

  it("cycles bullet markers as •, ◦, ▪", () => {
    expect(formatBulletListMarker(0)).toBe("•");
    expect(formatBulletListMarker(1)).toBe("◦");
    expect(formatBulletListMarker(2)).toBe("▪\uFE0E");
    expect(formatBulletListMarker(3)).toBe("•");
    expect(formatBulletListMarker(4)).toBe("◦");
    expect(formatBulletListMarker(5)).toBe("▪\uFE0E");
  });

  it("counts list depth from the editor document tree", () => {
    const editor = {
      getParentBlock: (blockId: string) => {
        const parents: Record<string, { id: string; type: string } | undefined> = {
          child: { id: "parent", type: "numberedListItem" },
          parent: { id: "bullet", type: "bulletListItem" },
          bullet: undefined,
        };
        return parents[blockId];
      },
    };

    expect(
      listItemNestingDepthFromDocument(editor, "child", "numberedListItem"),
    ).toBe(1);
    expect(
      listItemNestingDepthFromDocument(editor, "parent", "numberedListItem"),
    ).toBe(0);
  });

  it("converts indices to alpha and roman", () => {
    expect(indexToAlpha(1)).toBe("a");
    expect(indexToAlpha(26)).toBe("z");
    expect(indexToRoman(1)).toBe("i");
    expect(indexToRoman(4)).toBe("iv");
  });
});
