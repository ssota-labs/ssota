import { describe, expect, it } from "vitest";
import {
  formatLayoutDimensionClass,
  formatLayoutDimensionOnUnitChange,
  formatRadiusOnUnitChange,
  parseLayoutDimensionValue,
  resolveRadiusReferencePx,
} from "./tailwind-classname";

describe("layout dimension unit helpers", () => {
  it("parses bracket and legacy width classnames", () => {
    expect(parseLayoutDimensionValue("w-[200px]")).toEqual({
      value: "200",
      unit: "px",
    });
    expect(parseLayoutDimensionValue("h-[50%]")).toEqual({
      value: "50",
      unit: "%",
    });
    expect(parseLayoutDimensionValue("w-320px")).toEqual({
      value: "320",
      unit: "px",
    });
  });

  it("converts width between px and percent", () => {
    expect(
      formatLayoutDimensionOnUnitChange("w", "200", "px", "%", 400),
    ).toBe("w-[50%]");
    expect(
      formatLayoutDimensionOnUnitChange("w", "50", "%", "px", 400),
    ).toBe("w-[200px]");
    expect(formatLayoutDimensionClass("h", "120", "px")).toBe("h-[120px]");
  });

  it("uses parsed width and height for radius reference", () => {
    expect(
      resolveRadiusReferencePx({
        width: "w-[320px]",
        height: "h-[200px]",
      }),
    ).toBe(200);
    expect(resolveRadiusReferencePx({ width: "w-400px" })).toBe(400);
  });

  it("formats radius classname on unit change", () => {
    expect(
      formatRadiusOnUnitChange("rounded", "16", "px", "%", 320),
    ).toBe("rounded-[5%]");
  });
});
