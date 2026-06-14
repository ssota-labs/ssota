import { toCatalogSlug } from "./catalog-slug.js";

const INSTRUCTION_KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

/** Short random suffix for de-duplicating instruction keys. */
export function randomInstructionKeySuffix(length = 8): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, length);
}

/**
 * Derive a stable snake_case instructionKey from a title.
 * Non-Latin or invalid slugs fall back to `wf_<suffix>`.
 * Appends `_<suffix>` when the candidate is already taken.
 */
export function deriveInstructionKeyFromTitle(
  title: string,
  isTaken: (key: string) => boolean,
): string {
  let candidate = toCatalogSlug(title.trim())
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");

  if (!/^[a-z]/.test(candidate)) {
    candidate = candidate.replace(/^[^a-z]+/, "");
  }

  if (!INSTRUCTION_KEY_PATTERN.test(candidate)) {
    candidate = `wf_${randomInstructionKeySuffix(8)}`;
  }

  if (isTaken(candidate)) {
    candidate = `${candidate}_${randomInstructionKeySuffix(8)}`;
  }

  return candidate;
}
