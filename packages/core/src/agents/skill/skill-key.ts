import { toCatalogLabel } from "../../ontology/catalog-slug.js";
import { toRouteSlug } from "../../shared/console-slug.js";

const SKILL_KEY_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const SKILL_KEY_MAX_LEN = 48;

/** Agent Skills `name` → org library key (spec normalization + truncate). */
export function normalizeSkillKey(name: string): string {
  const key = toSkillKey(name);
  if (key.length <= SKILL_KEY_MAX_LEN) return key;
  return key.slice(0, SKILL_KEY_MAX_LEN).replace(/-+$/g, "") || "skill";
}

/** `frontend-design` → `Frontend Design`; preserves spaced display names. */
export function humanizeSkillName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.includes(" ")) return trimmed;
  return toCatalogLabel(trimmed.replace(/-/g, "_"));
}

/** Display name, folder name, or path segment → org skill key (kebab-case). */
export function toSkillKey(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "skill";
  const slug = toRouteSlug(trimmed);
  if (SKILL_KEY_PATTERN.test(slug)) return slug;
  const normalized = slug
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (normalized.length === 0) return "skill";
  if (SKILL_KEY_PATTERN.test(normalized)) return normalized;
  return normalized.slice(0, 48).replace(/-+$/g, "") || "skill";
}

/** Last directory segment before SKILL.md (e.g. skills/foo/SKILL.md → foo). */
export function skillKeyFromSkillPath(skillPath: string): string {
  const normalized = skillPath.replace(/\\/g, "/");
  if (normalized === "SKILL.md") return "skill";
  const dir = normalized.endsWith("/SKILL.md")
    ? normalized.slice(0, -"/SKILL.md".length)
    : normalized;
  const segment = dir.split("/").filter(Boolean).pop() ?? "skill";
  return toSkillKey(segment);
}

/** Folder picker root name → skill key. */
export function skillKeyFromFolderName(folderName: string): string {
  return toSkillKey(folderName);
}

/** Client-side preview: my-skill, my-skill-2, my-skill-3, … */
export function uniquifySkillKey(base: string, taken: Iterable<string>): string {
  const reserved = new Set(
    Array.from(taken, (key) => key.toLowerCase()),
  );
  const root = toSkillKey(base);
  if (!reserved.has(root.toLowerCase())) return root;
  let suffix = 2;
  while (suffix < 10_000) {
    const candidate = `${root}-${suffix}`;
    if (!reserved.has(candidate.toLowerCase())) return candidate;
    suffix += 1;
  }
  return `${root}-${Date.now()}`;
}
