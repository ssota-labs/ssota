"use client";

import { useEffect, useState } from "react";
import {
  loadConnectionToolSettingsAction,
  type ConnectionToolSettings,
} from "@/app/[orgSlug]/[teamspaceSlug]/connections/actions";
import type { ConnectorConnectScope } from "@/lib/connect/authorize-href";

export type ConnectionToolRow = {
  slug: string;
  name: string;
};

type ConnectionToolSettingsCacheEntry = {
  tools: ConnectionToolRow[];
  disabled: string[];
  fetchedAt: number;
};

const CACHE_TTL_MS = 5 * 60 * 1000;

const cache = new Map<string, ConnectionToolSettingsCacheEntry>();
const inflight = new Map<string, Promise<ConnectionToolSettingsCacheEntry>>();

function connectionSettingsCacheKey(
  teamspaceId: string,
  connectionId: string,
): string {
  return `${teamspaceId}:${connectionId}`;
}

function readCacheEntry(
  teamspaceId: string,
  connectionId: string,
): ConnectionToolSettingsCacheEntry | undefined {
  return cache.get(connectionSettingsCacheKey(teamspaceId, connectionId));
}

function isCacheFresh(entry: ConnectionToolSettingsCacheEntry): boolean {
  return Date.now() - entry.fetchedAt < CACHE_TTL_MS;
}

function mapSettingsResult(
  result: ConnectionToolSettings,
): ConnectionToolSettingsCacheEntry {
  return {
    tools: result.tools.map((tool) => ({
      slug: tool.slug,
      name: tool.name,
    })),
    disabled: result.disabled,
    fetchedAt: Date.now(),
  };
}

async function fetchConnectionToolSettings(input: {
  teamspaceId: string;
  connectionId: string;
  toolkit: string;
  scope: ConnectorConnectScope;
}): Promise<ConnectionToolSettingsCacheEntry> {
  const key = connectionSettingsCacheKey(input.teamspaceId, input.connectionId);
  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = loadConnectionToolSettingsAction(input)
    .then((result) => {
      const entry = mapSettingsResult(result);
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
export function prefetchConnectionToolSettings(input: {
  teamspaceId: string;
  connectionId: string;
  toolkit: string;
  scope: ConnectorConnectScope;
}): void {
  const cached = readCacheEntry(input.teamspaceId, input.connectionId);
  if (cached && isCacheFresh(cached)) return;
  void fetchConnectionToolSettings(input).catch(() => {});
}

export function invalidateConnectionToolSettingsCache(
  teamspaceId: string,
  connectionId: string,
): void {
  cache.delete(connectionSettingsCacheKey(teamspaceId, connectionId));
}

/** Keep cached tools while updating disabled slugs after a successful save. */
export function patchConnectionToolSettingsDisabledCache(
  teamspaceId: string,
  connectionId: string,
  disabled: string[],
): void {
  const key = connectionSettingsCacheKey(teamspaceId, connectionId);
  const entry = cache.get(key);
  if (!entry) return;
  cache.set(key, { ...entry, disabled, fetchedAt: Date.now() });
}

export function useConnectionToolSettings(input: {
  teamspaceId: string;
  connectionId: string;
  toolkit: string;
  scope: ConnectorConnectScope;
}): {
  tools: ConnectionToolRow[] | null;
  disabled: string[];
  loading: boolean;
  error: string | null;
} {
  const { teamspaceId, connectionId, toolkit, scope } = input;
  const cached = readCacheEntry(teamspaceId, connectionId);

  const [tools, setTools] = useState<ConnectionToolRow[] | null>(
    cached?.tools ?? null,
  );
  const [disabled, setDisabled] = useState<string[]>(cached?.disabled ?? []);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const entry = readCacheEntry(teamspaceId, connectionId);

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

    void fetchConnectionToolSettings({
      teamspaceId,
      connectionId,
      toolkit,
      scope,
    })
      .then((result) => {
        if (!active) return;
        setTools(result.tools);
        setDisabled(result.disabled);
        setError(null);
      })
      .catch(() => {
        if (!active) return;
        if (!readCacheEntry(teamspaceId, connectionId)) {
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
  }, [teamspaceId, connectionId, toolkit, scope]);

  return { tools, disabled, loading, error };
}
