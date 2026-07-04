"use client";

import { useEffect, useState } from "react";
import { loadToolkitToolSettingsAction } from "@/app/[orgSlug]/[teamspaceSlug]/connections/actions";

export type ToolkitToolRow = {
  slug: string;
  name: string;
};

type ToolkitToolSettingsCacheEntry = {
  tools: ToolkitToolRow[];
  disabled: string[];
  fetchedAt: number;
};

const CACHE_TTL_MS = 5 * 60 * 1000;

const cache = new Map<string, ToolkitToolSettingsCacheEntry>();
const inflight = new Map<string, Promise<ToolkitToolSettingsCacheEntry>>();

function toolkitSettingsCacheKey(teamspaceId: string, toolkit: string): string {
  return `${teamspaceId}:${toolkit.toLowerCase()}`;
}

function readCacheEntry(
  teamspaceId: string,
  toolkit: string,
): ToolkitToolSettingsCacheEntry | undefined {
  return cache.get(toolkitSettingsCacheKey(teamspaceId, toolkit));
}

function isCacheFresh(entry: ToolkitToolSettingsCacheEntry): boolean {
  return Date.now() - entry.fetchedAt < CACHE_TTL_MS;
}

async function fetchToolkitToolSettings(
  teamspaceId: string,
  toolkit: string,
): Promise<ToolkitToolSettingsCacheEntry> {
  const key = toolkitSettingsCacheKey(teamspaceId, toolkit);
  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = loadToolkitToolSettingsAction({ teamspaceId, toolkit })
    .then((result) => {
      const entry: ToolkitToolSettingsCacheEntry = {
        tools: result.tools.map((tool) => ({
          slug: tool.slug,
          name: tool.name,
        })),
        disabled: result.disabled,
        fetchedAt: Date.now(),
      };
      cache.set(key, entry);
      return entry;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

/** Warm cache before the permissions popover opens (e.g. gear hover). */
export function prefetchToolkitToolSettings(
  teamspaceId: string,
  toolkit: string,
): void {
  const cached = readCacheEntry(teamspaceId, toolkit);
  if (cached && isCacheFresh(cached)) return;
  void fetchToolkitToolSettings(teamspaceId, toolkit).catch(() => {});
}

export function invalidateToolkitToolSettingsCache(
  teamspaceId: string,
  toolkit: string,
): void {
  cache.delete(toolkitSettingsCacheKey(teamspaceId, toolkit));
}

export function useToolkitToolSettings(
  teamspaceId: string,
  toolkit: string,
): {
  tools: ToolkitToolRow[] | null;
  disabled: string[];
  loading: boolean;
  error: string | null;
} {
  const cached = readCacheEntry(teamspaceId, toolkit);

  const [tools, setTools] = useState<ToolkitToolRow[] | null>(
    cached?.tools ?? null,
  );
  const [disabled, setDisabled] = useState<string[]>(cached?.disabled ?? []);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const entry = readCacheEntry(teamspaceId, toolkit);

    if (entry) {
      setTools(entry.tools);
      setDisabled(entry.disabled);
      setLoading(false);
      setError(null);
      if (isCacheFresh(entry)) {
        return () => {
          active = false;
        };
      }
    } else {
      setLoading(true);
      setError(null);
    }

    void fetchToolkitToolSettings(teamspaceId, toolkit)
      .then((result) => {
        if (!active) return;
        setTools(result.tools);
        setDisabled(result.disabled);
        setError(null);
      })
      .catch(() => {
        if (!active) return;
        if (!readCacheEntry(teamspaceId, toolkit)) {
          setTools([]);
          setError("Could not load tools for this connector.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [teamspaceId, toolkit]);

  return { tools, disabled, loading, error };
}
