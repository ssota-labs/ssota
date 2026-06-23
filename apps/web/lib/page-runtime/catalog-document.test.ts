import { describe, expect, it } from "vitest";
import { toBlocks } from "./catalog-document";

describe("toBlocks", () => {
  it("returns undefined for empty content array (BlockNote rejects initialContent: [])", () => {
    expect(toBlocks([])).toBeUndefined();
  });

  it("returns blocks for non-empty array", () => {
    const blocks = [{ type: "paragraph", content: "hello" }];
    expect(toBlocks(blocks)).toEqual(blocks);
  });

  it("wraps non-empty string in a paragraph block", () => {
    expect(toBlocks("hello")).toEqual([
      { type: "paragraph", content: "hello" },
    ]);
  });

  it("returns undefined for empty string and nullish values", () => {
    expect(toBlocks("")).toBeUndefined();
    expect(toBlocks("   ")).toBeUndefined();
    expect(toBlocks(undefined)).toBeUndefined();
    expect(toBlocks(null)).toBeUndefined();
  });
});
