import { describe, expect, it } from "vitest";
import { parseStudioMessage } from "./protocol.js";

describe("studio preview runtime protocol", () => {
  it("parses STUDIO_READY", () => {
    expect(parseStudioMessage({ type: "STUDIO_READY" })).toEqual({
      type: "STUDIO_READY",
    });
  });

  it("parses STUDIO_LOAD_BUNDLE", () => {
    const message = parseStudioMessage({
      type: "STUDIO_LOAD_BUNDLE",
      jsUrl: "https://example.com/bundle.js",
      buildId: "abc123",
    });
    expect(message?.type).toBe("STUDIO_LOAD_BUNDLE");
  });

  it("parses STUDIO_PATCH", () => {
    const message = parseStudioMessage({
      type: "STUDIO_PATCH",
      nodeId: "node-1",
      patch: { className: "p-4" },
      sourceRef: { file: "Component.tsx", loc: "1:0" },
    });
    expect(message?.type).toBe("STUDIO_PATCH");
  });

  it("rejects invalid message", () => {
    expect(parseStudioMessage({ type: "UNKNOWN" })).toBeNull();
  });
});
