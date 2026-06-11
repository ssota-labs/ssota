import { PROJECT_ID_HEADER } from "@ssota/contracts";

/**
 * Project scope — one catalog/graph space per agent domain.
 * Authority: X-SSOTA-Project-Id header (required on all API/MCP requests).
 */
export function resolveProjectId(request: Request): string | undefined {
  const header = request.headers.get(PROJECT_ID_HEADER)?.trim();
  return header && header.length > 0 ? header : undefined;
}
