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

  it("prefers session content over published properties", () => {
    expect(
      resolveInitialContentV2({
        sessionContent,
        publishedProperties: {
          slug: "btn",
          tier: "primitive",
          entry: "Component.tsx",
          files: fallback.files,
        },
        fallback,
      }),
    ).toEqual(sessionContent);
  });

  it("falls back to published properties when session is empty", () => {
    expect(
      resolveInitialContentV2({
        sessionContent: null,
        publishedProperties: {
          slug: "btn",
          tier: "primitive",
          entry: "Component.tsx",
          files: sessionContent.files,
        },
        fallback,
      }),
    ).toEqual(sessionContent);
  });

  it("uses fallback when session and published are unavailable", () => {
    expect(
      resolveInitialContentV2({
        sessionContent: null,
        publishedProperties: null,
        fallback,
      }),
    ).toEqual(fallback);
  });
});
