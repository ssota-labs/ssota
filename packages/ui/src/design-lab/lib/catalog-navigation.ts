import type { ReactNode } from "react";

import type { StoryCatalogEntry } from "./story-catalog";

export type CatalogGroupId = "tokens" | "components" | "typography" | "page-patterns";

export type CatalogGroup = {
  id: CatalogGroupId;
  label: string;
  items: CatalogItem[];
};

export type CatalogItem = {
  id: string;
  groupId: CatalogGroupId;
  label: string;
  variants?: StoryCatalogEntry[];
  render?: () => ReactNode;
};

export type CatalogSelection = {
  groupId: CatalogGroupId;
  itemId: string;
  variantId: string | null;
};

export const DEFAULT_SELECTION: CatalogSelection = {
  groupId: "components",
  itemId: "button",
  variantId: null,
};

function pagePatternKeyFromTitle(title: string): string {
  const name = title.replace(/^PagePatterns\//, "");
  return name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

function pagePatternLabelFromTitle(title: string): string {
  const name = title.replace(/^PagePatterns\//, "");
  return name.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function componentKeyFromTitle(title: string): string {
  const name = title.replace(/^Components\//, "");
  return name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

function componentLabelFromTitle(title: string): string {
  const name = title.replace(/^Components\//, "");
  return name.replace(/([a-z])([A-Z])/g, "$1 $2");
}

export function formatVariantLabel(storyName: string): string {
  if (storyName === "AllVariants") return "All variants";
  return storyName
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ");
}

export function pickDefaultVariant(
  variants: StoryCatalogEntry[],
): StoryCatalogEntry | null {
  if (variants.length === 0) return null;

  const nonGallery = variants.filter((v) => v.storyName !== "AllVariants");

  return (
    nonGallery.find((v) => v.storyName === "Default") ??
    nonGallery.find((v) => v.storyName === "Preview") ??
    nonGallery.find((v) => v.storyName === "Open") ??
    nonGallery[0] ??
    variants.find((v) => v.storyName === "AllVariants") ??
    variants[0] ??
    null
  );
}

export function resolveVariant(
  item: CatalogItem,
  variantId: string | null,
): StoryCatalogEntry | null {
  if (!item.variants?.length) return null;
  if (variantId) {
    const found = item.variants.find((v) => v.id === variantId);
    if (found) return found;
  }
  return pickDefaultVariant(item.variants);
}

export function buildPagePatternItems(
  stories: StoryCatalogEntry[],
): CatalogItem[] {
  const byTitle = new Map<string, StoryCatalogEntry[]>();

  for (const story of stories) {
    if (!story.title.startsWith("PagePatterns/")) continue;
    const list = byTitle.get(story.title) ?? [];
    list.push(story);
    byTitle.set(story.title, list);
  }

  return [...byTitle.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([title, variants]) => ({
      id: pagePatternKeyFromTitle(title),
      groupId: "page-patterns" as const,
      label: pagePatternLabelFromTitle(title),
      variants: variants.sort((a, b) => a.storyName.localeCompare(b.storyName)),
    }));
}

export function buildComponentItems(
  stories: StoryCatalogEntry[],
): CatalogItem[] {
  const byTitle = new Map<string, StoryCatalogEntry[]>();

  for (const story of stories) {
    if (!story.title.startsWith("Components/")) continue;
    const list = byTitle.get(story.title) ?? [];
    list.push(story);
    byTitle.set(story.title, list);
  }

  return [...byTitle.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([title, variants]) => ({
      id: componentKeyFromTitle(title),
      groupId: "components" as const,
      label: componentLabelFromTitle(title),
      variants: variants.sort((a, b) => a.storyName.localeCompare(b.storyName)),
    }));
}

export function buildCatalogGroups(
  stories: StoryCatalogEntry[],
  builtInItems: {
    tokens: CatalogItem[];
    typography: CatalogItem[];
  },
): CatalogGroup[] {
  return [
    {
      id: "tokens",
      label: "Tokens",
      items: builtInItems.tokens,
    },
    {
      id: "components",
      label: "Components",
      items: buildComponentItems(stories),
    },
    {
      id: "page-patterns",
      label: "Page patterns",
      items: buildPagePatternItems(stories),
    },
    {
      id: "typography",
      label: "Typography",
      items: builtInItems.typography,
    },
  ];
}

export function findCatalogItem(
  groups: CatalogGroup[],
  groupId: CatalogGroupId,
  itemId: string,
): CatalogItem | undefined {
  return groups
    .find((g) => g.id === groupId)
    ?.items.find((item) => item.id === itemId);
}

export function filterCatalogGroups(
  groups: CatalogGroup[],
  query: string,
): CatalogGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return groups;

  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q) ||
          item.variants?.some((v) => v.storyName.toLowerCase().includes(q)),
      ),
    }))
    .filter((group) => group.items.length > 0);
}
