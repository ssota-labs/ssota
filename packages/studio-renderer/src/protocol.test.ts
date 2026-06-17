import { describe, expect, it } from "vitest";
import { parseStudioMessage } from "./protocol.js";

describe("studio protocol", () => {
  it("parses STUDIO_READY", () => {
    expect(parseStudioMessage({ type: "STUDIO_READY" })).toEqual({
      type: "STUDIO_READY",
    });
  });

  it("parses STUDIO_SET_TREE", () => {
    const message = parseStudioMessage({
      type: "STUDIO_SET_TREE",
      mode: "draft",
      tree: {
        kind: "element",
        id: "root",
        tag: "div",
        children: [],
      },
    });
    expect(message?.type).toBe("STUDIO_SET_TREE");
  });

  it("rejects invalid message", () => {
    expect(parseStudioMessage({ type: "UNKNOWN" })).toBeNull();
  });

  it("rejects builtin ref in tree", () => {
    expect(
      parseStudioMessage({
        type: "STUDIO_SET_TREE",
        mode: "draft",
        tree: {
          kind: "component",
          id: "c1",
          ref: { type: "builtin", name: "Button" },
          children: [],
        },
      }),
    ).toBeNull();
  });
});
