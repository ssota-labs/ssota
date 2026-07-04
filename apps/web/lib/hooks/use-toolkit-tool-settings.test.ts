import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { loadToolkitToolSettingsAction } = vi.hoisted(() => ({
  loadToolkitToolSettingsAction: vi.fn(),
}));

vi.mock("@/app/[orgSlug]/[teamspaceSlug]/connections/actions", () => ({
  loadToolkitToolSettingsAction,
}));

import {
  invalidateToolkitToolSettingsCache,
  prefetchToolkitToolSettings,
} from "./use-toolkit-tool-settings";

describe("use-toolkit-tool-settings cache", () => {
  beforeEach(() => {
    loadToolkitToolSettingsAction.mockReset();
    invalidateToolkitToolSettingsCache("team-1", "notion");
  });

  afterEach(() => {
    invalidateToolkitToolSettingsCache("team-1", "notion");
  });

  it("dedupes concurrent prefetch requests for the same toolkit", async () => {
    let resolveFetch!: (value: {
      tools: Array<{ slug: string; name: string }>;
      disabled: string[];
    }) => void;
    loadToolkitToolSettingsAction.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    prefetchToolkitToolSettings("team-1", "notion");
    prefetchToolkitToolSettings("team-1", "notion");

    expect(loadToolkitToolSettingsAction).toHaveBeenCalledTimes(1);

    resolveFetch({
      tools: [{ slug: "NOTION_SEARCH", name: "Search" }],
      disabled: [],
    });
    await vi.waitFor(() =>
      expect(loadToolkitToolSettingsAction).toHaveBeenCalledTimes(1),
    );
  });

  it("skips network when cache is still fresh", async () => {
    loadToolkitToolSettingsAction.mockResolvedValue({
      tools: [{ slug: "NOTION_SEARCH", name: "Search" }],
      disabled: [],
    });

    prefetchToolkitToolSettings("team-1", "notion");
    await vi.waitFor(() =>
      expect(loadToolkitToolSettingsAction).toHaveBeenCalledTimes(1),
    );

    prefetchToolkitToolSettings("team-1", "notion");
    expect(loadToolkitToolSettingsAction).toHaveBeenCalledTimes(1);
  });
});
