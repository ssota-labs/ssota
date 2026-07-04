import type { JsonRenderSpec } from "@ssota/contracts";

export type HoistedPageTabItem = {
  value: string;
  label: string;
  /** Spec element id for the tab panel. */
  panel: string;
};

export type HoistedPageTabs = {
  defaultValue: string;
  items: HoistedPageTabItem[];
};

export function pageUsesArtifactWorkbench(spec: JsonRenderSpec): boolean {
  return Object.values(spec.elements).some(
    (element) =>
      element.type === "ArtifactWorkbench" || element.type === "ComponentStudio",
  );
}

/** @deprecated Use {@link pageUsesArtifactWorkbench}. */
export const pageUsesComponentStudio = pageUsesArtifactWorkbench;

function parseHoistedTabItems(value: unknown): HoistedPageTabItem[] {
  if (!Array.isArray(value)) return [];
  const items: HoistedPageTabItem[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    if (
      typeof row.value !== "string" ||
      typeof row.label !== "string" ||
      typeof row.panel !== "string"
    ) {
      continue;
    }
    items.push({
      value: row.value,
      label: row.label,
      panel: row.panel,
    });
  }
  return items;
}

/** When the page root is `Tabs`, tab triggers render in PageSiblingNav instead. */
export function extractHoistedPageTabs(
  spec: JsonRenderSpec,
): HoistedPageTabs | null {
  const root = spec.elements[spec.root];
  if (!root || root.type !== "Tabs") return null;

  const props = root.props ?? {};
  const items = parseHoistedTabItems(props.items);
  if (items.length === 0) return null;

  const defaultValue =
    typeof props.defaultValue === "string" &&
    items.some((item) => item.value === props.defaultValue)
      ? props.defaultValue
      : items[0]!.value;

  return { defaultValue, items };
}

export function resolveHoistedTabValue(
  hoisted: HoistedPageTabs,
  tabParam: string | undefined,
): string {
  if (tabParam && hoisted.items.some((item) => item.value === tabParam)) {
    return tabParam;
  }
  return hoisted.defaultValue;
}
