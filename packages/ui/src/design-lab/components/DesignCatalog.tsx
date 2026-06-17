import { useMemo, useState } from "react";

import {
  filterCatalogGroups,
  type CatalogGroup,
  type CatalogGroupId,
  type CatalogSelection,
} from "../lib/catalog-navigation";

type DesignCatalogProps = {
  groups: CatalogGroup[];
  selection: CatalogSelection;
  onSelect: (selection: CatalogSelection) => void;
};

const GROUP_ORDER: CatalogGroupId[] = [
  "tokens",
  "components",
  "design-studio",
  "page-patterns",
  "typography",
];

export function DesignCatalog({
  groups,
  selection,
  onSelect,
}: DesignCatalogProps) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<CatalogGroupId, boolean>>({
    tokens: true,
    components: true,
    "design-studio": true,
    "page-patterns": true,
    typography: true,
  });

  const filteredGroups = useMemo(
    () => filterCatalogGroups(groups, query),
    [groups, query],
  );

  const orderedGroups = useMemo(
    () =>
      GROUP_ORDER.map((id) => filteredGroups.find((g) => g.id === id)).filter(
        (g): g is CatalogGroup => g !== undefined,
      ),
    [filteredGroups],
  );

  function toggleGroup(groupId: CatalogGroupId) {
    setExpanded((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  }

  return (
    <div className="flex h-full min-h-0 flex-col border-r border-border bg-card">
      <div className="border-b border-border p-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Design system
        </h2>
        <input
          type="search"
          placeholder="Search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mt-2 w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/25"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {orderedGroups.map((group) => {
          const isExpanded = expanded[group.id] ?? true;
          const isGroupActive = selection.groupId === group.id;

          return (
            <div key={group.id} className="mb-2">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs font-semibold transition-colors ${
                  isGroupActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{group.label}</span>
                <span className="text-[0.625rem]">{isExpanded ? "−" : "+"}</span>
              </button>
              {isExpanded && (
                <ul className="mt-0.5 space-y-0.5 pl-1">
                  {group.items.map((item) => {
                    const isSelected =
                      selection.groupId === group.id &&
                      selection.itemId === item.id;

                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() =>
                            onSelect({
                              groupId: group.id,
                              itemId: item.id,
                              variantId: null,
                            })
                          }
                          className={`w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "text-foreground hover:bg-muted"
                          }`}
                        >
                          {item.label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
