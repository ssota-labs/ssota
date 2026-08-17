import { toRouteSlug } from "../../shared/console-slug.js";

const WORKER_KEY_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const WORKER_KEY_MAX_LEN = 48;

/** Display name → teamspace worker key (kebab-case). */
export function toWorkerKey(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "worker";
  const slug = toRouteSlug(trimmed);
  if (WORKER_KEY_PATTERN.test(slug)) return slug;
  const normalized = slug
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (normalized.length === 0) return "worker";
  if (WORKER_KEY_PATTERN.test(normalized)) return normalized;
  return normalized.slice(0, WORKER_KEY_MAX_LEN).replace(/-+$/g, "") || "worker";
}

/** my-worker, my-worker-2, my-worker-3, … */
export function uniquifyWorkerKey(base: string, taken: Iterable<string>): string {
  const reserved = new Set(
    Array.from(taken, (key) => key.toLowerCase()),
  );
  const root = toWorkerKey(base);
  if (!reserved.has(root.toLowerCase())) return root;
  let suffix = 2;
  while (suffix < 10_000) {
    const candidate = `${root}-${suffix}`;
    if (!reserved.has(candidate.toLowerCase())) return candidate;
    suffix += 1;
  }
  return `${root}-${Date.now()}`;
}
