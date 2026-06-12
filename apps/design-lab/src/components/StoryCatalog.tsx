import { useMemo, useState } from "react";

import {
  groupStoriesByTitle,
  STORY_CATALOG,
  type StoryCatalogEntry,
} from "../lib/story-catalog";

type StoryCatalogProps = {
  selectedId: string | null;
  onSelect: (entry: StoryCatalogEntry) => void;
};

export function StoryCatalog({ selectedId, onSelect }: StoryCatalogProps) {
  const [query, setQuery] = useState("");
  const groups = useMemo(() => groupStoriesByTitle(STORY_CATALOG), []);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;

    const result = new Map<string, StoryCatalogEntry[]>();
    for (const [title, stories] of groups) {
      const matched = stories.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.storyName.toLowerCase().includes(q),
      );
      if (matched.length > 0) result.set(title, matched);
    }
    return result;
  }, [groups, query]);

  return (
    <div className="flex h-full flex-col border-r border-border bg-card">
      <div className="border-b border-border p-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Components
        </h2>
        <input
          type="search"
          placeholder="Search stories…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mt-2 w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/25"
        />
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {[...filteredGroups.entries()].map(([title, stories]) => (
          <div key={title} className="mb-3">
            <p className="px-2 py-1 text-[0.625rem] font-medium text-muted-foreground">
              {title.replace("Components/", "")}
            </p>
            <ul>
              {stories.map((story) => (
                <li key={story.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(story)}
                    className={`w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                      selectedId === story.id
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    {story.storyName}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
