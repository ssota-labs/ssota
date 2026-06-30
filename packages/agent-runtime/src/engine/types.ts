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
  /** Agent definition key for this run (main or task executor). */
  agentKey?: string;
  /** DB agent definition id when the executor is DB-backed. */
  agentDefinitionId?: string;
  /** Graph access limits from the agent definition. */
  nodeScopes?: NodeScope[];
  /** Trigger that started this run (for policy checks). */
  trigger?: AgentTrigger;
  /**
   * Sandbox id for dev-capable task runs. The provisioning step stores it here
   * (serializable); sandbox tool steps re-attach via `attachSandboxSession`.
   */
  sandboxId?: string;
}
