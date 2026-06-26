/**
 * Shared JSON Schema helpers for the Google REST connectors (Gmail, Drive,
 * Calendar). Kept tiny and dependency-free — these build the `inputSchema`
 * objects surfaced by connection_search.
 */

export const s = (description: string, extra?: Record<string, unknown>) => ({
  type: "string",
  description,
  ...extra,
});

export const n = (
  description: string,
  min?: number,
  max?: number,
  def?: number,
) => ({
  type: "number",
  description,
  ...(min !== undefined ? { minimum: min } : {}),
  ...(max !== undefined ? { maximum: max } : {}),
  ...(def !== undefined ? { default: def } : {}),
});

export const b = (description: string, def?: boolean) => ({
  type: "boolean",
  description,
  ...(def !== undefined ? { default: def } : {}),
});

export const arr = (description: string, itemType = "string") => ({
  type: "array",
  description,
  items: { type: itemType },
});

export const obj = (
  required: string[],
  properties: Record<string, unknown>,
): Record<string, unknown> => ({
  type: "object",
  properties,
  ...(required.length ? { required } : {}),
});
