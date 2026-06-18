import { describe, expect, it } from "vitest";
import { createEmptyUiComponentContentV2 } from "./empty-document";
import { resolveInitialContentV2 } from "./draft-storage";

describe("resolveInitialContentV2", () => {
  const fallback = createEmptyUiComponentContentV2();
  const sessionContent = {
    schemaVersion: 2 as const,
    files: {
      "Component.tsx": `export default function Component() { return null; }`,
    },
  };

  it("prefers session content over published content", () => {
    expect(
      resolveInitialContentV2({
        sessionContent,
        publishedContent: JSON.stringify(fallback),
        fallback,
      }),
    ).toEqual(sessionContent);
  });

  it("falls back to published content when session is empty", () => {
    expect(
      resolveInitialContentV2({
        sessionContent: null,
        publishedContent: JSON.stringify(sessionContent),
        fallback,
      }),
    ).toEqual(sessionContent);
  });

  it("uses fallback when session and published are unavailable", () => {
    expect(
      resolveInitialContentV2({
        sessionContent: null,
        publishedContent: null,
        fallback,
      }),
    ).toEqual(fallback);
  });
});
