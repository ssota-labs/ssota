export {
  requireUserFromExtra,
} from "@/lib/mcp/project-scope";

/** @deprecated Use resolveProjectIdForTool from project-scope.ts */
export function requireProjectFromExtra(
  extra: { authInfo?: import("@modelcontextprotocol/sdk/server/auth/types.js").AuthInfo } | undefined,
): string {
  const projectId = extra?.authInfo?.extra?.projectId;
  if (typeof projectId !== "string" || projectId.length === 0) {
    throw new Error("Project scope is required for this MCP endpoint");
  }
  return projectId;
}
