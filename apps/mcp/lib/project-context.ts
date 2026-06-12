import { PROJECT_ID_HEADER } from "@ssota/contracts";

/**
 * Legacy embedder BFF: project UUID via X-SSOTA-Project-Id header.
 * MCP project scope is orgSlug + projectSlug on tool params (see project-scope.ts).
 */
export function resolveProjectId(request: Request): string | undefined {
  const header = request.headers.get(PROJECT_ID_HEADER)?.trim();
  return header && header.length > 0 ? header : undefined;
}
