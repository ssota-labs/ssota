import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

export function readSubjectFromExtra(
  extra: { authInfo?: AuthInfo } | undefined,
): string | undefined {
  const subjectId = extra?.authInfo?.extra?.subjectId;
  return typeof subjectId === "string" && subjectId.length > 0
    ? subjectId
    : undefined;
}

export function requireProjectFromExtra(
  extra: { authInfo?: AuthInfo } | undefined,
): string {
  const projectId = extra?.authInfo?.extra?.projectId;
  if (typeof projectId !== "string" || projectId.length === 0) {
    throw new Error("Project scope is required for this MCP endpoint");
  }
  return projectId;
}
