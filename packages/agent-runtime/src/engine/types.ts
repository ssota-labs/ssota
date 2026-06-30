import type { AgentTrigger, NodeScope } from "@ssota/contracts";

/**
 * Scope passed to every SSOTA tool call. `accountId` is the end-user data
 * partition (Phase 5). It is optional in Phase 1 (always undefined / shared).
 */
export interface AgentRunContext {
  teamspaceId: string;
  organizationId: string;
  taskId?: string;
  runId: string;
  accountId?: string;
  /** Signed-in user driving the run (Supabase `auth.users.id`), if any. */
  profileId?: string;
  /** DB agent definition id for this run. */
  agentDefinitionId?: string;
  /** Graph access limits from the agent definition. */
  nodeScopes?: NodeScope[];
  /** Trigger that started this run (for policy checks). */
  trigger?: AgentTrigger;
  /**
   * DB sandbox session id for dev-capable task runs. Provisioning stores it here
   * (serializable); sandbox tool steps re-attach via SandboxSessionPort.
   */
  sandboxSessionId?: string;
  /** Sandbox access tier for tool subset filtering. */
  sandboxAccess?: "none" | "inspect" | "code";
}
