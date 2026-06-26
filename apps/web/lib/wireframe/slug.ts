/** Stable page key for wireframe navigation (slug property or title-derived). */
export function wireframeSlug(
  title: string,
  properties: Record<string, unknown>,
): string {
  const raw = properties.slug;
  if (typeof raw === "string" && raw.trim()) {
    return raw.trim().toLowerCase();
  }
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
