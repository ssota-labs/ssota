import { describe, expect, it } from "vitest";
import {
  formatShadowLengthPx,
  parseShadowLengthPx,
} from "./tailwind-classname";

describe("parseShadowLengthPx", () => {
  it("extracts numeric value from px string", () => {
    expect(parseShadowLengthPx("0px")).toBe("0");
    expect(parseShadowLengthPx("4px")).toBe("4");
    expect(parseShadowLengthPx("-2.5px")).toBe("-2.5");
  });

  it("returns empty for missing or invalid values", () => {
    expect(parseShadowLengthPx()).toBe("");
    expect(parseShadowLengthPx("")).toBe("");
    expect(parseShadowLengthPx("auto")).toBe("");
  });
});

describe("formatShadowLengthPx", () => {
  it("appends px unit", () => {
    expect(formatShadowLengthPx("0")).toBe("0px");
    expect(formatShadowLengthPx("4")).toBe("4px");
    expect(formatShadowLengthPx("-2")).toBe("-2px");
  });

  it("defaults empty input to 0px", () => {
    expect(formatShadowLengthPx("")).toBe("0px");
    expect(formatShadowLengthPx("   ")).toBe("0px");
  });
});
