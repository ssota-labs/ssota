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
  const propertiesDoc: UiComponentDocument = {
    schemaVersion: 1,
    root: { kind: "text", id: "p", text: "properties" },
  };
  const publishedDoc: UiComponentDocument = {
    schemaVersion: 1,
    root: { kind: "text", id: "c", text: "published" },
  };

  it("prefers session draft", () => {
    expect(
      resolveInitialDraft({
        sessionDraft: sessionDoc,
        propertiesDraft: JSON.stringify(propertiesDoc),
        publishedContent: JSON.stringify(publishedDoc),
        fallback,
      }).root,
    ).toEqual(sessionDoc.root);
  });

  it("falls back to properties draft", () => {
    expect(
      resolveInitialDraft({
        sessionDraft: null,
        propertiesDraft: JSON.stringify(propertiesDoc),
        publishedContent: JSON.stringify(publishedDoc),
        fallback,
      }).root,
    ).toEqual(propertiesDoc.root);
  });

  it("falls back to published content", () => {
    expect(
      resolveInitialDraft({
        sessionDraft: null,
        propertiesDraft: null,
        publishedContent: JSON.stringify(publishedDoc),
        fallback,
      }).root,
    ).toEqual(publishedDoc.root);
  });

  it("uses empty template when nothing else is available", () => {
    expect(
      resolveInitialDraft({
        sessionDraft: null,
        propertiesDraft: null,
        publishedContent: null,
        fallback,
      }),
    ).toEqual(fallback);
  });
});
