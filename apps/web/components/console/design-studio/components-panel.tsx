"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CaretDownIcon, CaretRightIcon } from "@phosphor-icons/react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@ssota/ui/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { groupUiComponents } from "@/lib/design-studio/component-groups";
import type { UiComponentListRow } from "@/lib/graph/loaders/query-ui-components";

type ComponentsPanelProps = {
  components: UiComponentListRow[];
  activeComponentId: string | null;
  studioBasePath: string;
  searchQuery?: string;
};

export function ComponentsPanel({
  components,
  activeComponentId,
  studioBasePath,
  searchQuery = "",
}: ComponentsPanelProps) {
  const router = useRouter();
  const filteredComponents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return components;
    return components.filter(
      (component) =>
        component.title.toLowerCase().includes(query) ||
        component.slug.toLowerCase().includes(query),
    );
  }, [components, searchQuery]);

  const groups = useMemo(
    () => groupUiComponents(filteredComponents),
    [filteredComponents],
  );
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((group) => [group.id, true])),
  );

  return (
    <div className="min-h-0 flex-1 overflow-auto p-2">
      {groups.length === 0 ? (
        <p className="px-2 py-4 text-xs text-muted-foreground">
          {searchQuery.trim()
            ? "No components match your search."
            : "No UI components yet. Create one to start editing in the studio."}
        </p>
      ) : (
        <div className="space-y-1">
          {groups.map((group) => {
            const open = openGroups[group.id] ?? true;
            return (
              <Collapsible
                key={group.id}
                open={open}
                onOpenChange={(nextOpen) => {
                  setOpenGroups((current) => ({
                    ...current,
                    [group.id]: nextOpen,
                  }));
                }}
              >
                <CollapsibleTrigger
                  type="button"
                  className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {open ? (
                    <CaretDownIcon className="size-3.5 shrink-0" />
                  ) : (
                    <CaretRightIcon className="size-3.5 shrink-0" />
                  )}
                  <span className="truncate">{group.label}</span>
                  <span className="ml-auto text-[10px] tabular-nums">
                    {group.items.length}
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-0.5 pb-1 pl-2">
                  {group.items.map((component) => {
                    const active = component.id === activeComponentId;
                    return (
                      <button
                        key={component.id}
                        type="button"
                        data-testid={`studio-component-${component.slug}`}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted",
                          active && "bg-muted",
                        )}
                        onClick={() => {
                          router.push(`${studioBasePath}/${component.id}`);
                        }}
                      >
                        <span
                          className={cn(
                            "min-w-0 flex-1 truncate text-sm",
                            active && "font-medium text-foreground",
                          )}
                        >
                          {component.title}
                        </span>
                      </button>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}
