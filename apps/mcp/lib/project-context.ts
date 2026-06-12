import { PROJECT_ID_HEADER } from "@ssota/contracts";

/**
 * Project scope — one catalog/graph space per agent domain.
 * Primary: `?org=&project=` query params on `/api/mcp` (Cursor mcp.json url).
 * Legacy: X-SSOTA-Project-Id header (embedder BFF only).
 */
export function resolveProjectId(request: Request): string | undefined {
  const header = request.headers.get(PROJECT_ID_HEADER)?.trim();
  return header && header.length > 0 ? header : undefined;
}
