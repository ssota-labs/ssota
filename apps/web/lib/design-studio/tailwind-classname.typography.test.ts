import { describe, expect, it } from "vitest";
import {
  formatFontSizeOnUnitChange,
  formatLineHeightOnUnitChange,
  parseClassName,
  parseFontSizeValue,
  serializeClassName,
} from "./tailwind-classname";

describe("typography unit change helpers", () => {
  it("applies a default font size when switching unit with an empty value", () => {
    expect(formatFontSizeOnUnitChange("", "%")).toBe("text-[100%]");
    expect(formatFontSizeOnUnitChange("", "em")).toBe("text-[1em]");
    expect(formatFontSizeOnUnitChange("", "px")).toBe("text-base");
  });

  it("keeps the numeric value when switching unit", () => {
    expect(formatFontSizeOnUnitChange("14", "%")).toBe("text-[14%]");
    expect(parseFontSizeValue("text-[14%]")).toEqual({ value: "14", unit: "%" });
  });

  it("round-trips font size unit changes through parse/serialize", () => {
    const parsed = parseClassName("text-sm font-medium");
    const next = {
      ...parsed,
      fontSize: formatFontSizeOnUnitChange(
        parseFontSizeValue(parsed.fontSize).value,
        "%",
      ),
    };
    const className = serializeClassName(next);
    expect(className).toContain("text-[14%]");
    expect(parseFontSizeValue(parseClassName(className).fontSize)).toEqual({
      value: "14",
      unit: "%",
    });
  });

  it("applies a default line height when switching unit with an empty value", () => {
    expect(formatLineHeightOnUnitChange("", "px")).toBe("leading-[24px]");
    expect(formatLineHeightOnUnitChange("", "%")).toBe("leading-[150%]");
    expect(formatLineHeightOnUnitChange("", "em")).toBe("leading-[1.5em]");
  });
});
