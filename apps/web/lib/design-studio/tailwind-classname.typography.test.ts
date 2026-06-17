import { describe, expect, it } from "vitest";
import {
  formatFontSizeOnUnitChange,
  formatLetterSpacingOnUnitChange,
  formatLineHeightOnUnitChange,
  parseClassName,
  parseFontSizeValue,
  parseLineHeightValue,
  serializeClassName,
} from "./tailwind-classname";

describe("typography unit change helpers", () => {
  it("applies a default font size when switching unit with an empty value", () => {
    expect(formatFontSizeOnUnitChange("", "px", "%")).toBe("text-[100%]");
    expect(formatFontSizeOnUnitChange("", "px", "em")).toBe("text-[1em]");
    expect(formatFontSizeOnUnitChange("", "px", "px")).toBe("text-base");
  });

  it("converts font size between units using a 16px parent reference", () => {
    expect(formatFontSizeOnUnitChange("14", "px", "%")).toBe("text-[87.5%]");
    expect(formatFontSizeOnUnitChange("100", "%", "px")).toBe("text-base");
    expect(parseFontSizeValue("text-[87.5%]")).toEqual({
      value: "87.5",
      unit: "%",
    });
  });

  it("round-trips font size unit changes through parse/serialize", () => {
    const parsed = parseClassName("text-sm font-medium");
    const next = {
      ...parsed,
      fontSize: formatFontSizeOnUnitChange(
        parseFontSizeValue(parsed.fontSize).value,
        parseFontSizeValue(parsed.fontSize).unit,
        "%",
      ),
    };
    const className = serializeClassName(next);
    expect(className).toContain("text-[87.5%]");
    expect(parseFontSizeValue(parseClassName(className).fontSize)).toEqual({
      value: "87.5",
      unit: "%",
    });
  });

  it("applies a default line height when switching unit with an empty value", () => {
    expect(formatLineHeightOnUnitChange("", "em", "px")).toBe("leading-[24px]");
    expect(formatLineHeightOnUnitChange("", "em", "%")).toBe("leading-[150%]");
    expect(formatLineHeightOnUnitChange("", "em", "em")).toBe("leading-[1.5em]");
  });

  it("converts line height between px and percent using font size", () => {
    expect(formatLineHeightOnUnitChange("150", "%", "px", 16)).toBe(
      "leading-[24px]",
    );
    expect(formatLineHeightOnUnitChange("24", "px", "%", 16)).toBe(
      "leading-[150%]",
    );
    expect(parseLineHeightValue("leading-[24px]")).toEqual({
      value: "24",
      unit: "px",
    });
  });

  it("converts line height between em and percent", () => {
    expect(formatLineHeightOnUnitChange("1.5", "em", "%", 16)).toBe(
      "leading-[150%]",
    );
    expect(formatLineHeightOnUnitChange("150", "%", "em", 16)).toBe(
      "leading-[1.5em]",
    );
  });

  it("converts letter spacing between px and percent using font size", () => {
    expect(formatLetterSpacingOnUnitChange("2", "px", "%", 16)).toBe(
      "tracking-[12.5%]",
    );
    expect(formatLetterSpacingOnUnitChange("5", "%", "px", 16)).toBe(
      "tracking-[0.8px]",
    );
  });
});
