/** English display name → URL slug (kebab-case) */
export function toRouteSlug(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug.length > 0 ? slug : "item";
}

const ENGLISH_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9 '-]*$/;

/** Workspace / project names: ASCII letters, digits, spaces, hyphens, apostrophes */
export function isEnglishDisplayName(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 64) return false;
  return ENGLISH_NAME_PATTERN.test(trimmed);
}
