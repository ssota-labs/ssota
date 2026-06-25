/** Normalize Next.js searchParams for binding resolution. */
export function normalizeSearchParams(
  params: Record<string, string | string[] | undefined>,
): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(params)) {
    out[key] = Array.isArray(value) ? value[0] : value;
  }
  return out;
}
