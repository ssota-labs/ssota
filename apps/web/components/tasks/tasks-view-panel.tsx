"use client";

import Link from "next/link";
import { ListChecksIcon } from "@phosphor-icons/react";
import { cn } from "@ssota/ui/lib/utils";
import type { TaskFilter, TaskTab } from "@/components/tasks/tasks-workspace";

export type TasksViewItem = {
  slug: TaskFilter;
  label: string;
  count: number;
};

type TasksViewPanelProps = {
  items: TasksViewItem[];
  activeFilter: TaskFilter;
  activeTab: TaskTab;
  baseHref: string;
};

export function TasksViewPanel({
  items,
  activeFilter,
  activeTab,
  baseHref,
}: TasksViewPanelProps) {
  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r bg-muted/30">
      <div className="border-b px-3 py-2.5">
        <p className="text-sm font-semibold text-foreground">Tasks</p>
        <p className="text-xs text-muted-foreground">Choose a view</p>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {items.map((item) => {
          const active = activeFilter === item.slug;
          return (
            <li key={item.slug}>
              <Link
                href={viewHref(baseHref, item.slug, activeTab)}
                scroll={false}
                aria-current={active ? "page" : undefined}
                data-testid={`tasks-view-${item.slug}`}
                className={cn(
                  "flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors hover:bg-muted/80",
                  active && "bg-muted font-medium text-foreground",
                )}
              >
                <ListChecksIcon
                  className="size-3 shrink-0 text-muted-foreground"
                  weight="regular"
                />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {item.count}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

function viewHref(baseHref: string, filter: TaskFilter, tab: TaskTab) {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("view", filter);
  if (tab !== "table") params.set("tab", tab);
  const query = params.toString();
  return query ? `${baseHref}?${query}` : baseHref;
}
