import { describe, expect, it, beforeEach } from "vitest";
import {
  clearPreviewUtilityCssCacheForTests,
  utilityClassesCacheKey,
} from "./preview-utility-css";

describe("utilityClassesCacheKey", () => {
  it("deduplicates and sorts class tokens", () => {
    expect(utilityClassesCacheKey(["rounded-[2px]", "px-4", "rounded-[2px]"])).toBe(
      utilityClassesCacheKey(["px-4", "rounded-[2px]"]),
    );
  });
});

describe("clearPreviewUtilityCssCacheForTests", () => {
  beforeEach(() => {
    clearPreviewUtilityCssCacheForTests();
  });

  it("clears cache without throwing", () => {
    expect(() => clearPreviewUtilityCssCacheForTests()).not.toThrow();
  });
});
