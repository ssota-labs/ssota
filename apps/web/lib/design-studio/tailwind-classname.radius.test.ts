import { describe, expect, it } from "vitest";
import {
  formatRadiusClass,
  formatRadiusOnUnitChange,
  formatRadiusValueOnUnitChange,
  parseRadiusValue,
  resolveRadiusReferencePx,
} from "./tailwind-classname";

describe("radius unit change helpers", () => {
  it("uses width/height arbitrary px as reference when available", () => {
    expect(
      resolveRadiusReferencePx({ width: "w-[200px]", height: "h-[400px]" }),
    ).toBe(200);
    expect(resolveRadiusReferencePx({ width: "w-[320px]" })).toBe(320);
    expect(resolveRadiusReferencePx({})).toBe(100);
  });

  it("converts px and percent using a 100px reference", () => {
    expect(formatRadiusValueOnUnitChange("8", "px", "%", 100)).toBe("8");
    expect(formatRadiusValueOnUnitChange("50", "%", "px", 100)).toBe("50");
    expect(formatRadiusValueOnUnitChange("8", "px", "%", 200)).toBe("4");
  });

  it("round-trips through radius classnames", () => {
    const className = formatRadiusClass("rounded", "8", "px");
    expect(className).toBe("rounded-[8px]");
    expect(parseRadiusValue("rounded-[8%]")).toEqual({ value: "8", unit: "%" });
    expect(
      formatRadiusClass(
        "rounded",
        formatRadiusValueOnUnitChange("8", "px", "%", 100),
        "%",
      ),
    ).toBe("rounded-[8%]");
  });

  it("emits zero class when converting empty radius on unit change", () => {
    expect(formatRadiusOnUnitChange("rounded", "", "px", "%", 100)).toBe(
      "rounded-[0%]",
    );
    expect(formatRadiusOnUnitChange("rounded", "8", "px", "%", 100)).toBe(
      "rounded-[8%]",
    );
  });

  it("converts 40px to 20% when reference width is 200px", () => {
    expect(formatRadiusOnUnitChange("rounded", "40", "px", "%", 200)).toBe(
      "rounded-[20%]",
    );
  });
});
