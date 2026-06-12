import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { z } from "zod";
import { resolveProjectAccess } from "@/lib/mcp/project-access";

/** Project scope passed on every project-scoped MCP tool call. */
export const mcpProjectScopeFields = {
  orgSlug: z
    .string()
    .min(1)
    .describe("Organization slug (from list_projects)"),
  projectSlug: z
    .string()
    .min(1)
    .describe("Project slug (from list_projects)"),
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
  const { orgSlug: _orgSlug, projectSlug: _projectSlug, ...rest } = args;
  return rest;
}

function readScopeSlugs(
  args: Record<string, unknown>,
  extra: { authInfo?: AuthInfo } | undefined,
): { orgSlug?: string; projectSlug?: string } {
  const authExtra = extra?.authInfo?.extra;

  const orgSlug =
    typeof args.orgSlug === "string" && args.orgSlug.length > 0
      ? args.orgSlug
      : typeof authExtra?.orgSlug === "string" && authExtra.orgSlug.length > 0
        ? authExtra.orgSlug
        : undefined;

  const projectSlug =
    typeof args.projectSlug === "string" && args.projectSlug.length > 0
      ? args.projectSlug
      : typeof authExtra?.projectSlug === "string" &&
          authExtra.projectSlug.length > 0
        ? authExtra.projectSlug
        : undefined;

  return { orgSlug, projectSlug };
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
  const { orgSlug, projectSlug } = readScopeSlugs(args, extra);

  if (orgSlug && projectSlug) {
    const access = await resolveProjectAccess(user.id, orgSlug, projectSlug);
    if (!access) {
      throw new Error("Project not found or access denied");
    }
    return access.project.id;
  }

  const projectId = extra?.authInfo?.extra?.projectId;
  if (typeof projectId === "string" && projectId.length > 0) {
    return projectId;
  }

  throw new Error("orgSlug and projectSlug are required for this tool");
}

export function readSubjectFromExtra(
  extra: { authInfo?: AuthInfo } | undefined,
): string | undefined {
  const subjectId = extra?.authInfo?.extra?.subjectId;
  return typeof subjectId === "string" && subjectId.length > 0
    ? subjectId
    : undefined;
}
