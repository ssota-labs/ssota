"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@ssota/ui/components/ui/command";
import type { SuggestionKeyDownProps } from "@tiptap/suggestion";

export type SuggestionMenuHandle = {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
};

export type SuggestionMenuItem = {
  id: string;
  title: string;
  description?: string;
  icon?: ReactNode;
};

export const SuggestionMenu = forwardRef<
  SuggestionMenuHandle,
  {
    items: SuggestionMenuItem[];
    emptyLabel?: string;
    ariaLabel: string;
    onSelect: (item: SuggestionMenuItem) => void;
  }
>(function SuggestionMenu(
  { items, emptyLabel = "No results", ariaLabel, onSelect },
  ref,
) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const visibleItems = useMemo(() => items, [items]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [visibleItems]);

  function selectItem(index: number) {
    const item = visibleItems[index];
    if (item) onSelect(item);
  }

  useImperativeHandle(ref, () => ({
    onKeyDown({ event }) {
      if (event.key === "ArrowUp") {
        setSelectedIndex((selected) =>
          selected <= 0 ? visibleItems.length - 1 : selected - 1,
        );
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((selected) =>
          selected >= visibleItems.length - 1 ? 0 : selected + 1,
        );
        return true;
      }
      if (event.key === "Enter") {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  return (
    <Command
      className="ssota-suggestion-menu"
      aria-label={ariaLabel}
      data-testid="ssota-suggestion-menu"
    >
      <CommandList>
        <CommandEmpty>{emptyLabel}</CommandEmpty>
        <CommandGroup>
          {visibleItems.map((item, index) => (
            <CommandItem
              key={item.id}
              value={item.id}
              data-selected={index === selectedIndex ? "true" : undefined}
              onMouseEnter={() => setSelectedIndex(index)}
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
});
