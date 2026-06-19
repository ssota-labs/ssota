import type { UiComponentContentV2 } from "@ssota/contracts/catalog";
import {
  parseUiComponentFromProperties,
  uiComponentContentSchemaV2,
} from "@ssota/contracts/catalog";

export function draftStorageKey(projectId: string, componentId: string): string {
  return `studio:draft:${projectId}:${componentId}`;
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

export function resolveInitialContentV2(input: {
  sessionContent: UiComponentContentV2 | null;
  publishedProperties?: Record<string, unknown> | null;
  fallback: UiComponentContentV2;
}): UiComponentContentV2 {
  if (input.sessionContent) return input.sessionContent;
  if (input.publishedProperties) {
    try {
      return parseUiComponentFromProperties(input.publishedProperties, "source");
    } catch {
      // fall through
    }
  }
  return input.fallback;
}
