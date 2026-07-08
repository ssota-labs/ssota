import { describe, expect, it } from "vitest";
import type { RenderNode } from "../../types";
import { aggregateSeries } from "./chart-aggregate";

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

describe("aggregateSeries (A4 chart aggregation)", () => {
  const expenses: RenderNode[] = [
    { id: "1", catalogKey: "expense", title: "AWS", properties: { category: "Cloud", amount: 5200 } },
    { id: "2", catalogKey: "expense", title: "Vercel", properties: { category: "Cloud", amount: 1800 } },
    { id: "3", catalogKey: "expense", title: "급여", properties: { category: "Payroll", amount: 4800 } },
  ];

  it("sums a valueField grouped by a field", () => {
    expect(
      aggregateSeries(expenses, { groupBy: "category", valueField: "amount", aggregate: "sum" }),
    ).toEqual([
      { label: "Cloud", value: 7000, capturedAt: "" },
      { label: "Payroll", value: 4800, capturedAt: "" },
    ]);
  });

  it("counts rows per group when no valueField", () => {
    expect(aggregateSeries(expenses, { groupBy: "category" }).map((p) => [p.label, p.value])).toEqual([
      ["Cloud", 2],
      ["Payroll", 1],
    ]);
  });

  it("averages numeric values per group", () => {
    expect(
      aggregateSeries(expenses, { groupBy: "category", valueField: "amount", aggregate: "avg" }),
    ).toEqual([
      { label: "Cloud", value: 3500, capturedAt: "" },
      { label: "Payroll", value: 4800, capturedAt: "" },
    ]);
  });

  it("returns [] without a groupBy (falls back to snapshot mode)", () => {
    expect(aggregateSeries(expenses, {})).toEqual([]);
  });
});
