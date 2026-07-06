import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { loadConnectionToolSettingsAction } = vi.hoisted(() => ({
  loadConnectionToolSettingsAction: vi.fn(),
}));

vi.mock("@/app/[orgSlug]/[teamspaceSlug]/connections/actions", () => ({
  loadConnectionToolSettingsAction,
}));

import {
  invalidateConnectionToolSettingsCache,
  patchConnectionToolSettingsDisabledCache,
  prefetchConnectionToolSettings,
} from "./use-connection-tool-settings";

const INPUT = {
  teamspaceId: "team-1",
  connectionId: "seed-notion-org-1",
  toolkit: "notion",
  scope: "org" as const,
};

describe("use-connection-tool-settings cache", () => {
  beforeEach(() => {
    loadConnectionToolSettingsAction.mockReset();
    invalidateConnectionToolSettingsCache(INPUT.teamspaceId, INPUT.connectionId);
  });

  afterEach(() => {
    invalidateConnectionToolSettingsCache(INPUT.teamspaceId, INPUT.connectionId);
  });

  it("dedupes concurrent prefetch requests for the same connection", async () => {
    let resolveFetch!: (value: {
      tools: Array<{ slug: string; name: string }>;
      disabled: string[];
    }) => void;
    loadConnectionToolSettingsAction.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    prefetchConnectionToolSettings(INPUT);
    prefetchConnectionToolSettings(INPUT);

    expect(loadConnectionToolSettingsAction).toHaveBeenCalledTimes(1);

    resolveFetch({
      tools: [{ slug: "NOTION_SEARCH", name: "Search" }],
      disabled: [],
    });
    await vi.waitFor(() =>
      expect(loadConnectionToolSettingsAction).toHaveBeenCalledTimes(1),
    );
  });

  it("skips network when cache is still fresh", async () => {
    loadConnectionToolSettingsAction.mockResolvedValue({
      tools: [{ slug: "NOTION_SEARCH", name: "Search" }],
      disabled: [],
    });

    prefetchConnectionToolSettings(INPUT);
    await vi.waitFor(() =>
      expect(loadConnectionToolSettingsAction).toHaveBeenCalledTimes(1),
    );

    prefetchConnectionToolSettings(INPUT);
    expect(loadConnectionToolSettingsAction).toHaveBeenCalledTimes(1);
  });

  it("patches disabled slugs without dropping cached tools", async () => {
    loadConnectionToolSettingsAction.mockResolvedValue({
      tools: [{ slug: "NOTION_SEARCH", name: "Search" }],
      disabled: [],
    });

    prefetchConnectionToolSettings(INPUT);
    await vi.waitFor(() =>
      expect(loadConnectionToolSettingsAction).toHaveBeenCalledTimes(1),
    );

    patchConnectionToolSettingsDisabledCache(
      INPUT.teamspaceId,
      INPUT.connectionId,
      ["NOTION_SEARCH"],
    );

    prefetchConnectionToolSettings(INPUT);
    expect(loadConnectionToolSettingsAction).toHaveBeenCalledTimes(1);
  });

  it("uses separate cache entries per connection id", async () => {
    loadConnectionToolSettingsAction.mockResolvedValue({
      tools: [{ slug: "NOTION_SEARCH", name: "Search" }],
      disabled: [],
    });

    prefetchConnectionToolSettings(INPUT);
    prefetchConnectionToolSettings({
      ...INPUT,
      connectionId: "seed-notion-org-2",
    });

    expect(loadConnectionToolSettingsAction).toHaveBeenCalledTimes(2);
  });
});
