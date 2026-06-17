import type { UiComponentContentV2 } from "@ssota/contracts/catalog";

/** Strip JSX className literals so class-only edits do not trigger rebuilds. */
export function normalizeSourceStructure(source: string): string {
  return source
    .replace(/className="[^"]*"/g, 'className=""')
    .replace(/className=\{"[^"]*"\}/g, 'className=""');
}

export function hashContentStructure(content: UiComponentContentV2): string {
  const normalized: Record<string, string> = {};
  for (const [path, source] of Object.entries(content.files)) {
    normalized[path] = normalizeSourceStructure(source);
  }
  return JSON.stringify(normalized);
}

const CLASSNAME_LITERAL_PATTERNS = [
  /className="([^"]+)"/g,
  /className=\{"([^"]+)"\}/g,
] as const;

export function collectClassNamesFromContentV2(
  content: UiComponentContentV2,
): string[] {
  const classes = new Set<string>();
  for (const source of Object.values(content.files)) {
    for (const pattern of CLASSNAME_LITERAL_PATTERNS) {
      for (const match of source.matchAll(pattern)) {
        const value = match[1];
        if (!value) continue;
        for (const token of value.split(/\s+/)) {
          const trimmed = token.trim();
          if (trimmed) classes.add(trimmed);
        }
      }
    }
  }
  return [...classes];
}
