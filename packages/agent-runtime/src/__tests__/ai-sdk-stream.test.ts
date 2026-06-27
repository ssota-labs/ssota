import { afterEach, describe, expect, it } from "vitest";
import { createAiSdkLoopEngine } from "../engine/ai-sdk.js";

describe("createAiSdkLoopEngine stream", () => {
  const previousStub = process.env.STUB_MODEL;

  afterEach(() => {
    if (previousStub === undefined) {
      delete process.env.STUB_MODEL;
    } else {
      process.env.STUB_MODEL = previousStub;
    }
  });

  it("closes the writable stream when streaming completes", async () => {
    process.env.STUB_MODEL = "1";

    let closed = false;
    const writable = new WritableStream({
      close() {
        closed = true;
      },
    });

    const engine = createAiSdkLoopEngine();
    await engine.stream!(
      {
        instructions: "You are a test assistant.",
        tools: {},
        messages: [{ role: "user", content: "hello" }],
        modelId: "stub/echo",
        context: {
          teamspaceId: "00000000-0000-4000-8000-000000000001",
          organizationId: "00000000-0000-4000-8000-000000000002",
          runId: "test-run",
        },
      },
      writable,
    );

    expect(closed).toBe(true);
  });
});
