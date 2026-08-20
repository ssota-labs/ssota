"use client";

import { useMemo, useState } from "react";
import { CaretDownIcon, CaretRightIcon, PlusIcon } from "@phosphor-icons/react";
import { Input } from "@ssota/ui/components/ui/input";
import { cn } from "@ssota/ui/lib/utils";

/**
 * 촘촘한 explorer — Supabase Table Editor 좌측 패널 결. 섹션(Objects·Links·Actions·Functions)마다
 * 항목을 한 줄(28px)로 나열하고, 검색은 모든 섹션에 동시에 걸린다.
 */

export interface ExplorerItem {
  id: string;
  key: string;
  label: string;
  badge?: string;
}

export interface ExplorerSection {
  id: string;
  title: string;
  items: ExplorerItem[];
  onCreate?: () => void;
  createLabel?: string;
}

export function OntologyExplorer({
  sections,
  selectedId,
  onSelect,
  emptyHint,
}: {
  sections: ExplorerSection[];
  selectedId: string | null;
  onSelect: (sectionId: string, item: ExplorerItem) => void;
  emptyHint?: string;
}) {
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections.map((s) => ({
      ...s,
      items: s.items.filter((i) => i.label.toLowerCase().includes(q) || i.key.toLowerCase().includes(q)),
    }));
  }, [sections, query]);

  const total = filtered.reduce((n, s) => n + s.items.length, 0);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r bg-background" data-testid="ontology-explorer">
      <div className="border-b p-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search types…"
          className="h-7 text-xs"
          aria-label="Search ontology"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-1">
        {total === 0 && query ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">No matches for “{query}”.</p>
        ) : null}
        {filtered.map((section) => {
          const isCollapsed = collapsed[section.id] ?? false;
          return (
            <div key={section.id} className="pb-1">
              <div className="flex items-center gap-1 px-1.5 py-1">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-1 rounded px-1 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground hover:bg-muted"
                  onClick={() => setCollapsed((c) => ({ ...c, [section.id]: !isCollapsed }))}
                  aria-expanded={!isCollapsed}
                >
                  {isCollapsed ? <CaretRightIcon className="size-3" /> : <CaretDownIcon className="size-3" />}
                  <span className="truncate">{section.title}</span>
                  <span className="ml-1 tabular-nums opacity-60">{section.items.length}</span>
                </button>
                {section.onCreate ? (
                  <button
                    type="button"
                    className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={section.onCreate}
                    aria-label={section.createLabel ?? `New ${section.title}`}
                    title={section.createLabel ?? `New ${section.title}`}
                  >
                    <PlusIcon className="size-3.5" />
                  </button>
                ) : null}
              </div>
              {isCollapsed ? null : (
                <ul>
                  {section.items.length === 0 ? (
                    <li className="px-6 py-1 text-[11px] text-muted-foreground">{emptyHint ?? "None yet"}</li>
                  ) : null}
                  {section.items.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(section.id, item)}
                        className={cn(
                          "flex h-7 w-full items-center gap-2 px-2 pl-6 text-left text-xs hover:bg-muted",
                          selectedId === item.id && "bg-muted font-medium",
                        )}
                        data-testid="ontology-explorer-item"
                      >
                        <span className="truncate">{item.label}</span>
                        <span className="ml-auto truncate font-mono text-[10px] text-muted-foreground">
                          {item.badge ?? item.key}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
