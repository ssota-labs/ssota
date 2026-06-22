"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  filterMentionCandidates,
  type MentionCandidate,
} from "@/lib/chat/mentions";

interface MentionInfo {
  /** Index of the triggering "@" in the textarea value. */
  start: number;
  /** The partial text typed after "@". */
  query: string;
}

/**
 * Detect an active "@mention" immediately before the cursor. Returns null when
 * the cursor isn't inside a mention token (whitespace/no "@" breaks it).
 */
function extractMention(text: string, cursor: number): MentionInfo | null {
  let at = -1;
  for (let i = cursor - 1; i >= 0; i--) {
    const ch = text[i];
    if (ch === undefined) break;
    if (ch === " " || ch === "\t" || ch === "\n") break;
    if (ch === "@") {
      // Only trigger at start-of-input or after whitespace (avoid emails).
      const prev = i > 0 ? text[i - 1] : " ";
      if (prev === " " || prev === "\t" || prev === "\n" || i === 0) {
        at = i;
      }
      break;
    }
  }
  if (at === -1) return null;
  return { start: at, query: text.slice(at + 1, cursor) };
}

export interface UseMentionSuggestions {
  /** Candidates to render (already filtered by the active query), or empty. */
  suggestions: MentionCandidate[];
  /** Whether the dropdown should be shown. */
  open: boolean;
  /** Index of the highlighted suggestion. */
  selectedIndex: number;
  /**
   * Handle a composer keydown. Returns true when the event was consumed by the
   * mention UI (caller should not also submit/insert a newline).
   */
  onKeyDown: (e: React.KeyboardEvent) => boolean;
  /** Apply a suggestion: returns the new value + caret position. */
  select: (
    candidate: MentionCandidate,
    value: string,
    cursor: number,
  ) => { value: string; cursor: number };
  /** Recompute the active mention from the current value + cursor. */
  refresh: (value: string, cursor: number) => void;
  /** Force-close the dropdown (e.g. on blur). */
  close: () => void;
}

/**
 * @-mention autocomplete for the chat composer. Candidates (connectors, graph
 * nodes, edges) are fetched once per project; filtering and keyboard navigation
 * happen client-side.
 */
export function useMentionSuggestions(
  orgSlug: string,
  projectSlug: string,
): UseMentionSuggestions {
  const [all, setAll] = useState<MentionCandidate[]>([]);
  const [mention, setMention] = useState<MentionInfo | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dismissedFor = useRef<string | null>(null);

  // Lazy-load candidates the first time a mention is opened.
  const loadedRef = useRef(false);
  const ensureLoaded = useCallback(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    const params = new URLSearchParams({ orgSlug, projectSlug });
    fetch(`/api/chat/mentions?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : { candidates: [] }))
      .then((d: { candidates?: MentionCandidate[] }) =>
        setAll(d.candidates ?? []),
      )
      .catch(() => setAll([]));
  }, [orgSlug, projectSlug]);

  const suggestions = useMemo(() => {
    if (!mention) return [];
    return filterMentionCandidates(all, mention.query);
  }, [all, mention]);

  const open = mention !== null && suggestions.length > 0;

  const refresh = useCallback(
    (value: string, cursor: number) => {
      const next = extractMention(value, cursor);
      if (next) {
        ensureLoaded();
        // Re-opening after an explicit dismiss requires the query to change.
        if (dismissedFor.current === `${next.start}:${next.query}`) return;
        dismissedFor.current = null;
      }
      // Reset the highlight to the top whenever the active mention changes.
      setSelectedIndex(0);
      setMention(next);
    },
    [ensureLoaded],
  );

  const close = useCallback(() => setMention(null), []);

  const select = useCallback(
    (candidate: MentionCandidate, value: string, cursor: number) => {
      const info = extractMention(value, cursor) ?? mention;
      if (!info) return { value, cursor };
      const before = value.slice(0, info.start);
      const after = value.slice(cursor);
      const token = `@${candidate.label} `;
      const nextValue = before + token + after;
      setMention(null);
      return { value: nextValue, cursor: before.length + token.length };
    },
    [mention],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent): boolean => {
      if (!open) return false;
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, suggestions.length - 1));
          return true;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          return true;
        case "Escape":
          e.preventDefault();
          if (mention) {
            dismissedFor.current = `${mention.start}:${mention.query}`;
          }
          setMention(null);
          return true;
        // Selection (Enter/Tab) is handled by the input so it can apply the
        // value+caret change; we only signal that the key is "ours".
        case "Enter":
        case "Tab":
          return true;
        default:
          return false;
      }
    },
    [open, suggestions.length, mention],
  );

  return {
    suggestions,
    open,
    selectedIndex,
    onKeyDown,
    select,
    refresh,
    close,
  };
}
