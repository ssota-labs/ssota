import { describe, expect, it } from "vitest";
import {
  formatColorToken,
  parseClassName,
  serializeClassName,
  splitClassNameTokens,
  stripColorToken,
} from "./tailwind-classname";

describe("splitClassNameTokens", () => {
  it("keeps arbitrary color values with internal spaces in one token", () => {
    expect(
      splitClassNameTokens("bg-[rgba(0, 0, 0, 0.5)] text-sm"),
    ).toEqual(["bg-[rgba(0, 0, 0, 0.5)]", "text-sm"]);
  });

  it("splits multiple top-level classes", () => {
    expect(splitClassNameTokens("flex gap-2 p-4")).toEqual([
      "flex",
      "gap-2",
      "p-4",
    ]);
  });
});

describe("rgba background color round-trip", () => {
  it("parses bg arbitrary rgba as background, not remainder", () => {
    const parsed = parseClassName("bg-[rgba(0, 0, 0, 0.5)] text-sm");
    expect(parsed.background).toBe("bg-[rgba(0, 0, 0, 0.5)]");
    expect(parsed.fontSize).toBe("text-sm");
    expect(parsed.remainder).toEqual([]);
  });

  it("strips compact rgba from bg token for the color picker input", () => {
    expect(stripColorToken("bg-[rgba(0,0,0,0.5)]", "bg")).toBe(
      "rgba(0,0,0,0.5)",
    );
  });

  it("formats rgba without spaces for tailwind arbitrary values", () => {
    expect(formatColorToken("bg", "rgba(0, 0, 0, 0.5)")).toBe(
      "bg-[rgba(0,0,0,0.5)]",
    );
  });

  it("round-trips rgba background through parse and serialize", () => {
    const className = serializeClassName({
      ...parseClassName("text-sm"),
      background: formatColorToken("bg", "rgba(37, 99, 235, 0.72)"),
    });
    expect(className).toContain("bg-[rgba(37,99,235,0.72)]");
    const reparsed = parseClassName(className);
    expect(reparsed.background).toBe("bg-[rgba(37,99,235,0.72)]");
    expect(reparsed.remainder).toEqual([]);
    expect(stripColorToken(reparsed.background, "bg")).toBe(
      "rgba(37,99,235,0.72)",
    );
  });
});
