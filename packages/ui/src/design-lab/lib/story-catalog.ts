import {
  createElement,
  type ComponentType,
  type ReactNode,
} from "react";

export type StoryModule = {
  default?: {
    title?: string;
    component?: ComponentType<Record<string, unknown>>;
  };
  [key: string]: unknown;
};

export type StoryCatalogEntry = {
  id: string;
  title: string;
  storyName: string;
  path: string;
  render: () => ReactNode;
};

/** @deprecated Use DEFAULT_SELECTION from catalog-navigation */
export const DEFAULT_STORY_ID = "Components/Button/AllVariants";

function renderStory(
  meta: StoryModule["default"],
  story: Record<string, unknown>,
): ReactNode {
  if (typeof story.render === "function") {
    return (story.render as () => ReactNode)();
  }
  if (meta?.component && story.args) {
    return createElement(
      meta.component,
      story.args as Record<string, unknown>,
    );
  }
  if (meta?.component) {
    return createElement(meta.component);
  }
  return null;
}

export function buildStoryCatalog(
  storyModules: Record<string, StoryModule>,
): StoryCatalogEntry[] {
  const entries: StoryCatalogEntry[] = [];

  for (const [path, mod] of Object.entries(storyModules)) {
    const meta = mod.default;
    if (!meta?.title) continue;

    for (const [exportName, value] of Object.entries(mod)) {
      if (exportName === "default") continue;
      if (typeof value !== "object" || value === null) continue;

      const story = value as Record<string, unknown>;
      const id = `${meta.title}/${exportName}`;

      entries.push({
        id,
        title: meta.title,
        storyName: exportName,
        path,
        render: () => renderStory(meta, story),
      });
    }
  }

  return entries.sort((a, b) => {
    const titleCmp = a.title.localeCompare(b.title);
    if (titleCmp !== 0) return titleCmp;
    return a.storyName.localeCompare(b.storyName);
  });
}

export function groupStoriesByTitle(
  entries: StoryCatalogEntry[],
): Map<string, StoryCatalogEntry[]> {
  const groups = new Map<string, StoryCatalogEntry[]>();
  for (const entry of entries) {
    const list = groups.get(entry.title) ?? [];
    list.push(entry);
    groups.set(entry.title, list);
  }
  return groups;
}
