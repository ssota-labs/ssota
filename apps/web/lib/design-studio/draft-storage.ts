import type {
  UiComponentContentV2,
  UiComponentDocument,
  UiComponentRepresentation,
} from "@ssota/contracts/catalog";
import {
  parseUiComponentDocumentSafe,
  uiComponentContentSchemaV2,
  uiComponentDocumentSchema,
} from "@ssota/contracts/catalog";

export function draftStorageKey(projectId: string, componentId: string): string {
  return `studio:draft:${projectId}:${componentId}`;
}

export function getUiComponentRepresentation(
  properties: Record<string, unknown>,
): UiComponentRepresentation {
  const value = properties.representation;
  return value === "source" ? "source" : "tree";
}

export function readSessionDraft(
  key: string,
): UiComponentDocument | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { schemaVersion?: number };
    if (parsed.schemaVersion === 2) return null;
    return uiComponentDocumentSchema.parse(parsed);
  } catch {
    return null;
  }
}

export function readSessionContentV2(key: string): UiComponentContentV2 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return uiComponentContentSchemaV2.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeSessionDraft(
  key: string,
  document: UiComponentDocument,
): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, JSON.stringify(document));
  } catch {
    // quota / private mode
  }
}

export function writeSessionContentV2(
  key: string,
  content: UiComponentContentV2,
): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, JSON.stringify(content));
  } catch {
    // quota / private mode
  }
}

export function clearSessionDraft(key: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function resolveInitialDraft(input: {
  sessionDraft: UiComponentDocument | null;
  propertiesDraft: string | null | undefined;
  publishedContent: string | null | undefined;
  fallback: UiComponentDocument;
}): UiComponentDocument {
  if (input.sessionDraft) return input.sessionDraft;
  if (input.propertiesDraft) {
    try {
      return uiComponentDocumentSchema.parse(JSON.parse(input.propertiesDraft));
    } catch {
      // fall through
    }
  }
  if (input.publishedContent) {
    const published = parseUiComponentDocumentSafe(input.publishedContent);
    if (published) return published;
  }
  return input.fallback;
}

export function resolveInitialContentV2(input: {
  sessionContent: UiComponentContentV2 | null;
  publishedContent: string | null | undefined;
  fallback: UiComponentContentV2;
}): UiComponentContentV2 {
  if (input.sessionContent) return input.sessionContent;
  if (input.publishedContent) {
    try {
      return uiComponentContentSchemaV2.parse(JSON.parse(input.publishedContent));
    } catch {
      // fall through
    }
  }
  return input.fallback;
}
