import { describe, expect, it } from "vitest";
import {
  aggregateObjectiveHealth,
  computeKeyResultHealth,
  computeProgress,
  parseMetricValue,
} from "./compute-goal-health";

describe("compute-goal-health", () => {
  it("parses numeric strings with percent", () => {
    expect(parseMetricValue("52%")).toBe(52);
    expect(parseMetricValue(6)).toBe(6);
  });

  it("computes increase progress", () => {
    expect(
      computeProgress({
        baseline: 40,
        current: 52,
        target: 70,
        direction: "increase",
      }),
    ).toBe(40);
  });

  it("computes decrease progress", () => {
    expect(
      computeProgress({
        baseline: 10,
        current: 7,
        target: 4,
        direction: "decrease",
      }),
    ).toBe(50);
  });

  it("returns baseline_pending when baseline missing", () => {
    expect(
      computeKeyResultHealth({
        baseline: null,
        current: null,
        target: 8,
      }),
    ).toBe("baseline_pending");
  });

  it("marks achieved at 100% progress", () => {
    expect(
      computeKeyResultHealth({
        baseline: 0,
        current: 8,
        target: 8,
        direction: "increase",
      }),
    ).toBe("achieved");
  });

  it("aggregates objective health from key results", () => {
    const result = aggregateObjectiveHealth([
      { status: "on_track", progress: 60 },
      { status: "at_risk", progress: 30 },
    ]);
    expect(result.status).toBe("at_risk");
    expect(result.progress).toBe(45);
  });
});
