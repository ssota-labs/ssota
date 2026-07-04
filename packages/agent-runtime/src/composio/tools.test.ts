import { afterEach, describe, expect, it, vi } from "vitest";
import { listComposioToolkitTools } from "./tools.js";
import { NOTION_STUB_TOOLS } from "./stub-toolkit-tools.js";

describe("listComposioToolkitTools", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.COMPOSIO_API_KEY;
  });

  it("returns Notion stub tools when Composio is off and CONNECT_STUB=1", async () => {
    vi.stubEnv("CONNECT_STUB", "1");
    delete process.env.COMPOSIO_API_KEY;

    await expect(listComposioToolkitTools("notion")).resolves.toEqual(
      NOTION_STUB_TOOLS,
    );
  });

  it("returns empty list when Composio is off and stub seed is disabled", async () => {
    vi.stubEnv("CONNECT_STUB", "");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AGENT_TOOLS_CONNECTION_SEED", "");
    delete process.env.COMPOSIO_API_KEY;

    await expect(listComposioToolkitTools("notion")).resolves.toEqual([]);
  });
});
