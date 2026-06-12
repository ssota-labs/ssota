export type DocsCatalogEntry = {
  itemId: string;
  path: string;
  content: string;
};

function itemIdFromDocsPath(path: string): string | null {
  const match = path.match(/\/([^/]+)\.docs\.md$/);
  if (!match) return null;
  return match[1] ?? null;
}

export function buildDocsCatalog(
  markdownModules: Record<string, string>,
): Map<string, DocsCatalogEntry> {
  const catalog = new Map<string, DocsCatalogEntry>();

  for (const [path, content] of Object.entries(markdownModules)) {
    const itemId = itemIdFromDocsPath(path);
    if (!itemId || !content.trim()) continue;

    catalog.set(itemId, {
      itemId,
      path,
      content,
    });
  }

  return catalog;
}
