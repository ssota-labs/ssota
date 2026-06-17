import type { UiComponentListRow } from "@/lib/graph/loaders/query-ui-components";

export type UiComponentGroup = {
  id: string;
  label: string;
  items: UiComponentListRow[];
};

const TIER_GROUP_ORDER = ["primitive", "composite"] as const;

const TIER_LABELS: Record<string, string> = {
  primitive: "Primitives",
  composite: "Composites",
};

export function groupUiComponents(
  rows: UiComponentListRow[],
): UiComponentGroup[] {
  const byTier = new Map<string, UiComponentListRow[]>();

  for (const row of rows) {
    const tier = row.tier || "primitive";
    const bucket = byTier.get(tier) ?? [];
    bucket.push(row);
    byTier.set(tier, bucket);
  }

  const groups: UiComponentGroup[] = [];

  for (const tier of TIER_GROUP_ORDER) {
    const items = byTier.get(tier);
    if (!items?.length) continue;
    groups.push({
      id: tier,
      label: TIER_LABELS[tier] ?? tier,
      items,
    });
    byTier.delete(tier);
  }

  for (const [tier, items] of byTier.entries()) {
    groups.push({
      id: tier,
      label: TIER_LABELS[tier] ?? tier,
      items,
    });
  }

  return groups;
}
