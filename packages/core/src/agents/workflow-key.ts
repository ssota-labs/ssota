import { toCatalogSlug } from "../ontology/catalog-slug.js";

const WORKFLOW_KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

/** Short random suffix for de-duplicating workflow keys. */
export function randomWorkflowKeySuffix(length = 8): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, length);
}

/**
 * Derive a stable snake_case workflowKey from a title.
 * Non-Latin or invalid slugs fall back to `wf_<suffix>`.
 * Appends `_<suffix>` when the candidate is already taken.
 */
export function deriveWorkflowKeyFromTitle(
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

  if (!WORKFLOW_KEY_PATTERN.test(candidate)) {
    candidate = `wf_${randomWorkflowKeySuffix(8)}`;
  }

  if (isTaken(candidate)) {
    candidate = `${candidate}_${randomWorkflowKeySuffix(8)}`;
  }

  return candidate;
}
