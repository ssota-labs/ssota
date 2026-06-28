import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { z } from "zod";
import { resolveProjectAccess } from "@/lib/mcp/project-access";

/** Teamspace scope passed on every project-scoped MCP tool call. */
export const mcpProjectScopeFields = {
  orgSlug: z
    .string()
    .min(1)
    .describe("Organization slug (from list_projects)"),
  teamspaceSlug: z
    .string()
    .min(1)
    .describe("Teamspace slug (from list_projects)"),
};

export const McpProjectScopeSchema = z.object(mcpProjectScopeFields);

export function requireUserFromExtra(
  extra: { authInfo?: AuthInfo } | undefined,
): { id: string } {
  const user = extra?.authInfo?.extra?.user as { id: string } | undefined;
  if (!user?.id) {
    throw new Error("Unauthorized");
  }
  return user;
}

export function stripProjectScope(
  args: Record<string, unknown>,
): Record<string, unknown> {
  const { orgSlug: _orgSlug, teamspaceSlug: _projectSlug, ...rest } = args;
  return rest;
}

function readScopeSlugs(
  args: Record<string, unknown>,
  extra: { authInfo?: AuthInfo } | undefined,
): { orgSlug?: string; teamspaceSlug?: string } {
  const authExtra = extra?.authInfo?.extra;

  const orgSlug =
    typeof args.orgSlug === "string" && args.orgSlug.length > 0
      ? args.orgSlug
      : typeof authExtra?.orgSlug === "string" && authExtra.orgSlug.length > 0
        ? authExtra.orgSlug
        : undefined;

  const teamspaceSlug =
    typeof args.teamspaceSlug === "string" && args.teamspaceSlug.length > 0
      ? args.teamspaceSlug
      : typeof authExtra?.teamspaceSlug === "string" &&
          authExtra.teamspaceSlug.length > 0
        ? authExtra.teamspaceSlug
        : undefined;

  return { orgSlug, teamspaceSlug };
}

/**
 * Resolve project UUID for a tool call.
 * Prefers tool args, then auth defaults (URL query at connect time).
 * Always re-validates membership when slugs are available.
 */
export async function resolveProjectIdForTool(
  args: Record<string, unknown>,
  extra: { authInfo?: AuthInfo } | undefined,
): Promise<string> {
  const user = requireUserFromExtra(extra);
  const { orgSlug, teamspaceSlug } = readScopeSlugs(args, extra);

  if (orgSlug && teamspaceSlug) {
    const access = await resolveProjectAccess(user.id, orgSlug, teamspaceSlug);
    if (!access) {
      throw new Error("Teamspace not found or access denied");
    }
    return access.project.id;
  }

  const teamspaceId = extra?.authInfo?.extra?.teamspaceId;
  if (typeof teamspaceId === "string" && teamspaceId.length > 0) {
    return teamspaceId;
  }

  throw new Error("orgSlug and teamspaceSlug are required for this tool");
}
