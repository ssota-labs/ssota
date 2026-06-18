const utilityCssCache = new Map<string, string>();
const MAX_UTILITY_CSS_CACHE_ENTRIES = 64;

export function utilityClassesCacheKey(classes: string[]): string {
  return [...new Set(classes)].sort().join("\0");
}

export async function fetchPreviewUtilityCss(classes: string[]): Promise<string> {
  if (classes.length === 0) return "";
  const response = await fetch("/api/studio/preview-utilities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ classes }),
  });
  if (!response.ok) return "";
  return response.text();
}

export async function fetchPreviewUtilityCssCached(
  classes: string[],
): Promise<string> {
  if (classes.length === 0) return "";

  const key = utilityClassesCacheKey(classes);
  const cached = utilityCssCache.get(key);
  if (cached !== undefined) return cached;

  const cssText = await fetchPreviewUtilityCss(classes);
  if (utilityCssCache.size >= MAX_UTILITY_CSS_CACHE_ENTRIES) {
    const oldestKey = utilityCssCache.keys().next().value;
    if (oldestKey) utilityCssCache.delete(oldestKey);
  }
  utilityCssCache.set(key, cssText);
  return cssText;
}

/** @internal test helper */
export function clearPreviewUtilityCssCacheForTests(): void {
  utilityCssCache.clear();
}
