import { describe, expect, it } from "vitest";
import type { UiComponentDocument } from "@ssota/contracts/catalog";
import { createEmptyUiComponentDocument } from "./empty-document";
import { resolveInitialDraft } from "./draft-storage";

describe("resolveInitialDraft", () => {
  const fallback = createEmptyUiComponentDocument();
  const sessionDoc: UiComponentDocument = {
    schemaVersion: 1,
    root: { kind: "text", id: "s", text: "session" },
  };
  const publishedDoc: UiComponentDocument = {
    schemaVersion: 1,
    root: { kind: "text", id: "c", text: "published" },
  };

  it("prefers session draft", () => {
    expect(
      resolveInitialDraft({
        sessionDraft: sessionDoc,
        publishedContent: JSON.stringify(publishedDoc),
        fallback,
      }).root,
    ).toEqual(sessionDoc.root);
  });

  it("falls back to published content", () => {
    expect(
      resolveInitialDraft({
        sessionDraft: null,
        publishedContent: JSON.stringify(publishedDoc),
        fallback,
      }).root,
    ).toEqual(publishedDoc.root);
  });

  it("uses empty template when nothing else is available", () => {
    expect(
      resolveInitialDraft({
        sessionDraft: null,
        publishedContent: null,
        fallback,
      }),
    ).toEqual(fallback);
  });
});
