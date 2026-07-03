import { describe, expect, it } from "vitest";
import { isCapturedAtInPeriod, parsePeriodPreset } from "./period-preset";

describe("parsePeriodPreset", () => {
  it("parses Q2 2026 into Apr–Jun UTC range", () => {
    const range = parsePeriodPreset("Q2 2026");
    expect(range).not.toBeNull();
    expect(range!.start.toISOString()).toBe("2026-04-01T00:00:00.000Z");
    expect(range!.end.getUTCMonth()).toBe(5);
    expect(range!.end.getUTCDate()).toBe(30);
  });

  it("returns null for invalid presets", () => {
    expect(parsePeriodPreset("2026-Q2")).toBeNull();
    expect(parsePeriodPreset("")).toBeNull();
  });
});

describe("isCapturedAtInPeriod", () => {
  const q2 = parsePeriodPreset("Q2 2026");

  it("includes dates inside the quarter", () => {
    expect(isCapturedAtInPeriod("2026-05-12T00:00:00.000Z", q2)).toBe(true);
  });

  it("excludes dates outside the quarter", () => {
    expect(isCapturedAtInPeriod("2026-07-08T00:00:00.000Z", q2)).toBe(false);
  });

  it("passes through when range is null", () => {
    expect(isCapturedAtInPeriod("2026-07-08T00:00:00.000Z", null)).toBe(true);
  });
});
