import { describe, expect, it } from "vitest";

import {
  getToolcraftTimelineLoopProgress,
  getToolcraftTimelineLoopTime,
} from "./timeline-loop";

describe("timeline loop helpers", () => {
  it("wraps timeline time into a forward-only seamless loop", () => {
    expect(
      getToolcraftTimelineLoopTime({
        currentTimeSeconds: 0,
        durationSeconds: 8,
      }),
    ).toBe(0);
    expect(
      getToolcraftTimelineLoopTime({
        currentTimeSeconds: 7.5,
        durationSeconds: 8,
      }),
    ).toBe(7.5);
    expect(
      getToolcraftTimelineLoopTime({
        currentTimeSeconds: 8,
        durationSeconds: 8,
      }),
    ).toBe(0);
    expect(
      getToolcraftTimelineLoopTime({
        currentTimeSeconds: 9.25,
        durationSeconds: 8,
      }),
    ).toBe(1.25);
  });

  it("maps one full product cycle to the current timeline duration", () => {
    expect(
      getToolcraftTimelineLoopProgress({
        currentTimeSeconds: 2,
        durationSeconds: 4,
      }),
    ).toBe(0.5);
    expect(
      getToolcraftTimelineLoopProgress({
        currentTimeSeconds: 2,
        durationSeconds: 8,
      }),
    ).toBe(0.25);
    expect(
      getToolcraftTimelineLoopProgress({
        currentTimeSeconds: 8,
        durationSeconds: 8,
      }),
    ).toBe(0);
  });

  it("handles invalid timeline values as the first loop frame", () => {
    expect(
      getToolcraftTimelineLoopProgress({
        currentTimeSeconds: Number.NaN,
        durationSeconds: 8,
      }),
    ).toBe(0);
    expect(
      getToolcraftTimelineLoopProgress({
        currentTimeSeconds: 4,
        durationSeconds: 0,
      }),
    ).toBe(0);
  });
});
