/**
 * Scope passed to every SSOTA tool call. `accountId` is the end-user data
 * partition (Phase 5). It is optional in Phase 1 (always undefined / shared).
 */
export interface AgentRunContext {
  projectId: string;
  taskId?: string;
  runId: string;
  accountId?: string;
}
