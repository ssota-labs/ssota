import { describe, expect, it } from "vitest";
import {
  applyShadowPreset,
  formatShadowLengthPx,
  parseClassName,
  parseShadowLengthPx,
} from "./tailwind-classname";

describe("applyShadowPreset", () => {
  it("fills representative dimensions for built-in presets", () => {
    expect(applyShadowPreset("sm")).toMatchObject({
      preset: "sm",
      x: "0px",
      y: "1px",
      blur: "2px",
      spread: "0px",
      inset: false,
    });
    expect(applyShadowPreset("md")).toMatchObject({
      preset: "md",
      y: "4px",
      blur: "6px",
      spread: "-1px",
    });
  });

  it("keeps custom values when switching to custom", () => {
    const custom = applyShadowPreset("custom", {
      preset: "sm",
      x: "2px",
      y: "3px",
      blur: "4px",
      spread: "1px",
      color: "rgba(0, 0, 0, 0.2)",
      inset: true,
    });

    expect(custom).toMatchObject({
      preset: "custom",
      x: "2px",
      y: "3px",
      blur: "4px",
      spread: "1px",
      inset: true,
    });
  });
});

describe("parseClassName shadow presets", () => {
  it("hydrates numeric fields from preset tokens", () => {
    expect(parseClassName("shadow-md").shadow).toMatchObject({
      preset: "md",
      y: "4px",
      blur: "6px",
      spread: "-1px",
    });
  });
});

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
