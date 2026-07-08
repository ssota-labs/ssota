import type { RenderNode } from "../../types";
import type { ChartAgg, KpiSeriesPoint } from "./chart-types";

/**
 * Aggregation series (pure): group the bound nodes by `agg.groupBy` and reduce
 * `valueField` with count/sum/avg into one series point per group. Extracted from
 * the client-only chart data hook so the transform is unit-testable on its own
 * (the preview browser can't render recharts — ResponsiveContainer is RO-based).
 * `count` needs no valueField; sum/avg ignore non-numeric values.
 */
export function aggregateSeries(nodes: RenderNode[], agg: ChartAgg): KpiSeriesPoint[] {
  if (!agg.groupBy) return [];
  const groupBy = agg.groupBy;
  const valueField = agg.valueField;
  const kind = agg.aggregate ?? (valueField ? "sum" : "count");
  const groups = new Map<string, number[]>();
  for (const node of nodes) {
    const props = node.properties as Record<string, unknown>;
    const key = String(props?.[groupBy] ?? "");
    const raw = valueField ? props?.[valueField] : undefined;
    const num = typeof raw === "number" ? raw : Number(raw);
    const arr = groups.get(key) ?? [];
    arr.push(num);
    groups.set(key, arr);
  }
  return [...groups.entries()].map(([label, values]) => {
    let value: number;
    if (kind === "count") {
      value = values.length;
    } else {
      const nums = values.filter((v) => Number.isFinite(v));
      const sum = nums.reduce((a, b) => a + b, 0);
      value = kind === "avg" ? (nums.length ? sum / nums.length : 0) : sum;
    }
    return { label: label || "—", value, capturedAt: "" };
  });
}
