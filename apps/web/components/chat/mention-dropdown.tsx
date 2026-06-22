"use client";

import {
  PlugIcon,
  CircleIcon,
  ArrowRightIcon,
} from "@phosphor-icons/react";
import { cn } from "@ssota/ui/lib/utils";
import {
  mentionSectionTitle,
  type MentionCandidate,
  type MentionKind,
} from "@/lib/chat/mentions";

interface MentionDropdownProps {
  suggestions: MentionCandidate[];
  selectedIndex: number;
  onSelect: (candidate: MentionCandidate) => void;
}

function MentionIcon({ kind }: { kind: MentionKind }) {
  if (kind === "connector") return <PlugIcon className="size-4 shrink-0 opacity-60" />;
  if (kind === "edge") return <ArrowRightIcon className="size-4 shrink-0 opacity-60" />;
  return <CircleIcon className="size-4 shrink-0 opacity-60" />;
}

/** Floating @mention suggestion list, anchored above the composer. */
export function MentionDropdown({
  suggestions,
  selectedIndex,
  onSelect,
}: MentionDropdownProps) {
  if (suggestions.length === 0) return null;

  let previousKind: MentionKind | null = null;

  return (
    <div
      data-testid="mention-dropdown"
      className="absolute bottom-full left-0 z-20 mb-2 w-80 overflow-hidden rounded-xl border bg-popover shadow-lg"
    >
      <ul className="max-h-72 overflow-y-auto py-1">
        {suggestions.map((candidate, index) => {
          const sectionTitle = mentionSectionTitle(
            candidate.kind,
            index === 0,
            previousKind,
          );
          previousKind = candidate.kind;
          return (
            <li key={candidate.id}>
              {sectionTitle ? (
                <div
                  data-testid={`mention-section-${candidate.kind}`}
                  className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                >
                  {sectionTitle}
                </div>
              ) : null}
              <button
                type="button"
                data-testid={`mention-option-${candidate.kind}`}
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
                <MentionIcon kind={candidate.kind} />
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
