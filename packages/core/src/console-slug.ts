import { slugify } from "transliteration";

/** Display name → URL slug (kebab-case, ASCII). Non-Latin text is romanized. */
export function toRouteSlug(name: string): string {
  const slug = slugify(name.trim(), {
    lowercase: true,
    separator: "-",
    trim: true,
  }).slice(0, 48);

  return slug.length > 0 ? slug : "item";
}

const ENGLISH_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9 '-]*$/;

/** Organization names: ASCII letters, digits, spaces, hyphens, apostrophes */
export function isEnglishDisplayName(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 64) return false;
  return ENGLISH_NAME_PATTERN.test(trimmed);
}

const DISPLAY_NAME_PATTERN = /^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N} '\-_.]*$/u;

/** Project names: letters and numbers from any language, plus spaces and hyphens. */
export function isDisplayName(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 64) return false;
  if (!DISPLAY_NAME_PATTERN.test(trimmed)) return false;
  return /[\p{L}\p{N}]/u.test(trimmed);
}
