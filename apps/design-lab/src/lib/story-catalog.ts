import {
  createElement,
  type ComponentType,
  type ReactNode,
} from "react";

type StoryModule = {
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

const storyModules = import.meta.glob(
  "../../../../packages/ui/src/**/*.stories.tsx",
  { eager: true },
) as Record<string, StoryModule>;

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

function buildCatalog(): StoryCatalogEntry[] {
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

export const STORY_CATALOG = buildCatalog();

export const DEFAULT_STORY_ID = "Components/Button/AllVariants";

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
