import type { ComponentType } from "react";

export type DocsModule = {
  default: ComponentType<Record<string, unknown>>;
};

export type DocsCatalogEntry = {
  itemId: string;
  path: string;
  Component: ComponentType<Record<string, unknown>>;
};

function itemIdFromDocsPath(path: string): string | null {
  const match = path.match(/\/([^/]+)\.docs\.mdx$/);
  if (!match) return null;
  return match[1] ?? null;
}

export function buildDocsCatalog(
  mdxModules: Record<string, DocsModule>,
): Map<string, DocsCatalogEntry> {
  const catalog = new Map<string, DocsCatalogEntry>();

  for (const [path, mod] of Object.entries(mdxModules)) {
    const itemId = itemIdFromDocsPath(path);
    if (!itemId || !mod.default) continue;

    catalog.set(itemId, {
      itemId,
      path,
      Component: mod.default,
    });
  }

  return catalog;
}
