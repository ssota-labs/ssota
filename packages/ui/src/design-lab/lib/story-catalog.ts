import {
  createElement,
  type ComponentType,
  type ReactNode,
} from "react";

export type ArgTypeDef = {
  control?: string | { type: string };
  options?: readonly string[];
  description?: string;
  table?: {
    defaultValue?: { summary?: string };
  };
};

export type StoryMeta = {
  title?: string;
  component?: ComponentType<Record<string, unknown>>;
  tags?: string[];
  argTypes?: Record<string, ArgTypeDef>;
  parameters?: Record<string, unknown>;
};

export type StoryModule = {
  default?: StoryMeta;
  [key: string]: unknown;
};

export type StoryCatalogEntry = {
  id: string;
  title: string;
  storyName: string;
  path: string;
  render: () => ReactNode;
};

export type ComponentDocsMeta = {
  title: string;
  itemId: string;
  tags?: string[];
  argTypes?: Record<string, ArgTypeDef>;
  parameters?: Record<string, unknown>;
};

/** @deprecated Use DEFAULT_SELECTION from catalog-navigation */
export const DEFAULT_STORY_ID = "Components/Button/AllVariants";

function componentKeyFromTitle(title: string): string {
  const name = title.replace(/^Components\//, "");
  return name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

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

export function buildComponentDocsMeta(
  storyModules: Record<string, StoryModule>,
): Map<string, ComponentDocsMeta> {
  const metaByItem = new Map<string, ComponentDocsMeta>();

  for (const mod of Object.values(storyModules)) {
    const meta = mod.default;
    if (!meta?.title?.startsWith("Components/")) continue;

    const itemId = componentKeyFromTitle(meta.title);
    metaByItem.set(itemId, {
      title: meta.title,
      itemId,
      tags: meta.tags,
      argTypes: meta.argTypes,
      parameters: meta.parameters,
    });
  }

  return metaByItem;
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
