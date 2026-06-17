import type { UiComponentDocument } from "@ssota/contracts/catalog";
import { uiComponentDocumentSchema } from "@ssota/contracts/catalog";
import { parseUiComponentDocumentSafe } from "@ssota/contracts/catalog";

export function draftStorageKey(projectId: string, componentId: string): string {
  return `studio:draft:${projectId}:${componentId}`;
}

export function readSessionDraft(
  key: string,
): UiComponentDocument | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return uiComponentDocumentSchema.parse(JSON.parse(raw));
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
