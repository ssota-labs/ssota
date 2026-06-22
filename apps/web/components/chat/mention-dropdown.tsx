"use client";

import { PlugIcon, CircleIcon } from "@phosphor-icons/react";
import { cn } from "@ssota/ui/lib/utils";
import type { MentionCandidate } from "@/app/api/chat/mentions/route";

interface MentionDropdownProps {
  suggestions: MentionCandidate[];
  selectedIndex: number;
  onSelect: (candidate: MentionCandidate) => void;
}

/** Floating @mention suggestion list, anchored above the composer. */
export function MentionDropdown({
  suggestions,
  selectedIndex,
  onSelect,
}: MentionDropdownProps) {
  if (suggestions.length === 0) return null;

  return (
    <div
      data-testid="mention-dropdown"
      className="absolute bottom-full left-0 z-20 mb-2 w-72 overflow-hidden rounded-xl border bg-popover shadow-lg"
    >
      <ul className="max-h-64 overflow-y-auto py-1">
        {suggestions.map((candidate, index) => {
          const Icon = candidate.kind === "connector" ? PlugIcon : CircleIcon;
          return (
            <li key={candidate.id}>
              <button
                type="button"
                // Use onMouseDown so selection fires before the textarea blurs.
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(candidate);
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
                  index === selectedIndex
                    ? "bg-secondary text-secondary-foreground"
                    : "hover:bg-secondary/60",
                )}
              >
                <Icon className="size-4 shrink-0 opacity-60" />
                <span className="flex-1 truncate">{candidate.label}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {candidate.hint}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="border-t px-3 py-1.5 text-xs text-muted-foreground">
        ↑↓ 이동 · Tab/Enter 선택 · Esc 닫기
      </div>
    </div>
  );
}
