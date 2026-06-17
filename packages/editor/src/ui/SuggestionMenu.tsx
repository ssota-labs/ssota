"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@ssota/ui/components/ui/command";
import type { SuggestionPortalInjectedProps } from "./suggestion-portal";

export type SuggestionMenuItem = {
  id: string;
  title: string;
  description?: string;
  icon?: ReactNode;
};

export function SuggestionMenu({
  items,
  emptyLabel = "No results",
  ariaLabel,
  onSelect,
  suggestionSelectedIndex,
  onSuggestionSelectIndex,
}: {
  items: SuggestionMenuItem[];
  emptyLabel?: string;
  ariaLabel: string;
  onSelect: (item: SuggestionMenuItem) => void;
} & SuggestionPortalInjectedProps) {
  const visibleItems = useMemo(() => items, [items]);
  const listRef = useRef<HTMLDivElement>(null);
  const selectedIndex = suggestionSelectedIndex;

  const selectItem = useCallback(
    (index: number) => {
      const item = visibleItems[index];
      if (item) onSelect(item);
    },
    [onSelect, visibleItems],
  );

  useEffect(() => {
    const selected = listRef.current?.querySelector('[data-selected="true"]');
    selected?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  return (
    <Command
      shouldFilter={false}
      tabIndex={-1}
      onMouseDown={(event) => event.preventDefault()}
      className="ssota-suggestion-menu"
      aria-label={ariaLabel}
      data-testid="ssota-suggestion-menu"
    >
      <CommandList ref={listRef}>
        <CommandEmpty>{emptyLabel}</CommandEmpty>
        <CommandGroup>
          {visibleItems.map((item, index) => (
            <CommandItem
              key={item.id}
              value={item.id}
              data-selected={index === selectedIndex ? "true" : undefined}
              onMouseEnter={() => onSuggestionSelectIndex(index)}
              onSelect={() => selectItem(index)}
              className="ssota-suggestion-menu-item"
            >
              {item.icon ? (
                <span className="ssota-suggestion-menu-icon">{item.icon}</span>
              ) : null}
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {item.title}
                </span>
                {item.description ? (
                  <span className="block truncate text-xs text-muted-foreground">
                    {item.description}
                  </span>
                ) : null}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
