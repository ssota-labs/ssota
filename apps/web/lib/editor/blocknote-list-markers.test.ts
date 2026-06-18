import { describe, expect, it } from "vitest";

import {
  formatNumberedListMarker,
  indexToAlpha,
  indexToRoman,
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

  it("converts indices to alpha and roman", () => {
    expect(indexToAlpha(1)).toBe("a");
    expect(indexToAlpha(26)).toBe("z");
    expect(indexToRoman(1)).toBe("i");
    expect(indexToRoman(4)).toBe("iv");
  });
});
