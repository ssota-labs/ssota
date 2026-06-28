import { PROJECT_ID_HEADER } from "@ssota/contracts";

/**
 * Optional project UUID via X-SSOTA-Teamspace-Id header (legacy tooling).
 * MCP project scope SSOT is orgSlug + teamspaceSlug on tool params (see project-scope.ts).
 */
export function resolveProjectId(request: Request): string | undefined {
  const header = request.headers.get(PROJECT_ID_HEADER)?.trim();
  return header && header.length > 0 ? header : undefined;
}
