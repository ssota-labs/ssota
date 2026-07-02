import { describe, expect, it } from "vitest";

import {
  getCurvePointAtX,
  type CurveInterpolation,
  type CurvePoint,
} from "@repo/ui/controls";

function sampleCurve(
  points: readonly CurvePoint[],
  interpolation: CurveInterpolation,
  samples = 200,
): CurvePoint[] {
  return Array.from({ length: samples + 1 }, (_, index) =>
    getCurvePointAtX(points, index / samples, interpolation),
  );
}

describe("curve geometry", () => {
  it("keeps editor curves inside the normalized output range", () => {
    const steepCurve = [
      { x: 0, y: 0 },
      { x: 0.12, y: 0.85 },
      { x: 1, y: 1 },
    ];
    const delayedCurve = [
      { x: 0, y: 0 },
      { x: 0.88, y: 0.15 },
      { x: 1, y: 1 },
    ];

    for (const point of [
      ...sampleCurve(steepCurve, "monotone"),
      ...sampleCurve(delayedCurve, "monotone"),
      ...sampleCurve(steepCurve, "smooth"),
      ...sampleCurve(delayedCurve, "smooth"),
    ]) {
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(1);
    }
  });

  it("keeps monotone curves monotone between control points", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 0.12, y: 0.85 },
      { x: 1, y: 1 },
    ];
    let previousY = -Infinity;

    for (const point of sampleCurve(points, "monotone")) {
      expect(point.y).toBeGreaterThanOrEqual(previousY - 0.000001);
      previousY = point.y;
    }
  });

  it("keeps photo smooth interpolation distinct from monotone response curves", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 0.12, y: 0.85 },
      { x: 1, y: 1 },
    ];
    const smoothMidPoint = getCurvePointAtX(points, 0.06, "smooth");
    const monotoneMidPoint = getCurvePointAtX(points, 0.06, "monotone");

    expect(Math.abs(smoothMidPoint.y - monotoneMidPoint.y)).toBeGreaterThan(0.01);
    expect(smoothMidPoint.y).toBeGreaterThan(0);
    expect(smoothMidPoint.y).toBeLessThan(1);
  });
});
