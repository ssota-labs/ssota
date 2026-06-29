import { describe, expect, it } from "vitest";
import type { RenderNode } from "../../types";

// Mirror readSnapshots shape handling for graph-backed snapshot rows.
function readSnapshots(
  node: RenderNode | undefined,
  snapshotProperty: string,
): Array<{ value: number; captured_at?: string }> {
  if (!node) return [];
  const raw = (node.properties as Record<string, unknown>)?.[snapshotProperty];
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const props =
      row.properties && typeof row.properties === "object"
        ? (row.properties as Record<string, unknown>)
        : row;
    const value = props.value;
    if (typeof value !== "number" || Number.isNaN(value)) return [];
    return [
      {
        value,
        captured_at:
          typeof props.captured_at === "string" ? props.captured_at : undefined,
      },
    ];
  });
}

describe("KPI snapshot rows", () => {
  it("reads values from nested graph snapshot properties", () => {
    const kpi: RenderNode = {
      id: "kpi-1",
      catalogKey: "kpi",
      title: "Workspace creation rate",
      properties: {
        snapshots: [
          {
            id: "snap-1",
            catalogKey: "metric_snapshot",
            title: "Apr",
            properties: { value: 12, captured_at: "2026-04-05T00:00:00.000Z" },
          },
        ],
      },
    };

    expect(readSnapshots(kpi, "snapshots")).toEqual([
      { value: 12, captured_at: "2026-04-05T00:00:00.000Z" },
    ]);
  });
});
