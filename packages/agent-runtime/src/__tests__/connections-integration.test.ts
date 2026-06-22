import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createEnvCredentialProvider } from "../credentials/provider.js";
import { ConnectionRunState } from "../connections/run-state.js";
import { McpSessionManager } from "../connections/mcp-session.js";
import { createConnectionTools } from "../tools/connections.js";

describe("createConnectionTools (MCP_STUB)", () => {
  const prevStub = process.env.MCP_STUB;
  const prevLinear = process.env.LINEAR_CONNECT_CONNECTOR;

  beforeEach(() => {
    process.env.MCP_STUB = "1";
    process.env.LINEAR_CONNECT_CONNECTOR = "linear/test";
    process.env.CONNECTOR_LINEAR_TEST_TOKEN = "stub-token";
  });

  afterEach(() => {
    if (prevStub === undefined) delete process.env.MCP_STUB;
    else process.env.MCP_STUB = prevStub;
    if (prevLinear === undefined) delete process.env.LINEAR_CONNECT_CONNECTOR;
    else process.env.LINEAR_CONNECT_CONNECTOR = prevLinear;
    delete process.env.CONNECTOR_LINEAR_TEST_TOKEN;
  });

  it("exposes connection_search without account connections", async () => {
    const credentials = createEnvCredentialProvider();
    const sessionManager = new McpSessionManager(credentials);
    const bundle = await createConnectionTools({
      credentials,
      projectId: "project-1",
      connectionState: new ConnectionRunState(),
      sessionManager,
    });

    expect(bundle.tools.connection_search).toBeDefined();
    expect(bundle.tools.request_connection).toBeDefined();
    expect(bundle.qualifiedToolNames).toEqual([]);
    await sessionManager.close();
  });
});
