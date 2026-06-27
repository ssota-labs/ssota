export {
  requireUserFromExtra,
} from "@/lib/mcp/project-scope";

/** @deprecated Use resolveProjectIdForTool from project-scope.ts */
export function requireProjectFromExtra(
  extra: { authInfo?: import("@modelcontextprotocol/sdk/server/auth/types.js").AuthInfo } | undefined,
): string {
  const teamspaceId = extra?.authInfo?.extra?.teamspaceId;
  if (typeof teamspaceId !== "string" || teamspaceId.length === 0) {
    throw new Error("Teamspace scope is required for this MCP endpoint");
  }
  return teamspaceId;
}
