import { describe, expect, it } from "vitest";
import {
  parseListMarkerBeforeSpace,
  parseListMarkerPrefix,
  stripListMarkerText,
} from "./list-marker-utils";

describe("stripListMarkerText", () => {
  it("removes bullet markers", () => {
    expect(stripListMarkerText("- hello")).toBe("hello");
    expect(stripListMarkerText("* hello")).toBe("hello");
    expect(stripListMarkerText("+ hello")).toBe("hello");
  });

  it("removes ordered markers", () => {
    expect(stripListMarkerText("1. hello")).toBe("hello");
    expect(stripListMarkerText("12. hello")).toBe("hello");
  });

  it("keeps plain text", () => {
    expect(stripListMarkerText("hello")).toBe("hello");
  });
});

describe("parseListMarkerBeforeSpace", () => {
  it("detects bullet marker before space", () => {
    expect(parseListMarkerBeforeSpace("-")).toEqual({
      markerLength: 2,
      listType: "bulletList",
    });
    expect(parseListMarkerBeforeSpace("*")).toEqual({
      markerLength: 2,
      listType: "bulletList",
    });
  });

  it("detects ordered marker before space", () => {
    expect(parseListMarkerBeforeSpace("1.")).toEqual({
      markerLength: 3,
      orderedStart: 1,
      listType: "orderedList",
    });
  });
});

describe("parseListMarkerPrefix", () => {
  it("detects completed markdown prefixes", () => {
    expect(parseListMarkerPrefix("- ")).toEqual({ markerLength: 2 });
    expect(parseListMarkerPrefix("1. ")).toEqual({
      markerLength: 3,
      orderedStart: 1,
    });
  });
});
