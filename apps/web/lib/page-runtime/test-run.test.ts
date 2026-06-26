import { describe, expect, it } from "vitest";
import {
  coerceTestRun,
  formatDuration,
  progressShares,
} from "./test-run";

describe("coerceTestRun", () => {
  it("returns an empty run for junk", () => {
    expect(coerceTestRun(null).suites).toEqual([]);
    expect(coerceTestRun(42).suites).toEqual([]);
    expect(coerceTestRun({}).suites).toEqual([]);
  });

  it("accepts { suites }, a bare array, or { tests } (wrapped)", () => {
    expect(coerceTestRun({ suites: [{ name: "S", tests: [] }] }).suites).toHaveLength(1);
    expect(coerceTestRun([{ name: "S", tests: [] }]).suites).toHaveLength(1);
    const wrapped = coerceTestRun({ tests: [{ name: "t", status: "passed" }] });
    expect(wrapped.suites).toHaveLength(1);
    expect(wrapped.suites[0]!.name).toBe("Tests");
  });

  it("derives suite status + computes the summary from test statuses", () => {
    const run = coerceTestRun({
      suites: [
        {
          name: "auth",
          tests: [
            { name: "a", status: "passed", duration: 10 },
            { name: "b", status: "failed", duration: 5, error: { message: "boom" } },
            { name: "c", status: "skipped" },
          ],
        },
        {
          name: "utils",
          tests: [{ name: "d", status: "passed", duration: 2 }],
        },
      ],
    });
    // suite with a failure → failed + auto default-open
    expect(run.suites[0]!.status).toBe("failed");
    expect(run.suites[0]!.defaultOpen).toBe(true);
    expect(run.suites[1]!.status).toBe("passed");
    expect(run.summary).toMatchObject({
      passed: 2,
      failed: 1,
      skipped: 1,
      running: 0,
      total: 4,
      duration: 17,
    });
    // error preserved
    expect(run.suites[0]!.tests[1]!.error).toEqual({ message: "boom" });
  });

  it("prefers an explicit summary.duration over the test sum", () => {
    const run = coerceTestRun({
      summary: { duration: 999 },
      tests: [{ name: "a", status: "passed", duration: 10 }],
    });
    expect(run.summary.duration).toBe(999);
  });

  it("marks an all-skipped suite as skipped", () => {
    const run = coerceTestRun({
      suites: [{ name: "s", tests: [{ name: "a", status: "skipped" }] }],
    });
    expect(run.suites[0]!.status).toBe("skipped");
  });
});

describe("formatDuration", () => {
  it("formats ms and seconds", () => {
    expect(formatDuration(undefined)).toBeUndefined();
    expect(formatDuration(12)).toBe("12ms");
    expect(formatDuration(1400)).toBe("1.40s");
    expect(formatDuration(15000)).toBe("15.0s");
  });
});

describe("progressShares", () => {
  it("splits percentages and tolerates a zero total", () => {
    const s = progressShares({ passed: 3, failed: 1, skipped: 0, running: 0, total: 4 });
    expect(s.passed).toBe(75);
    expect(s.failed).toBe(25);
    expect(() =>
      progressShares({ passed: 0, failed: 0, skipped: 0, running: 0, total: 0 }),
    ).not.toThrow();
  });
});
