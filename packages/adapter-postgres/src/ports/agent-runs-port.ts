import { and, eq, gte } from "drizzle-orm";
import type { AgentRuntimeKind } from "@ssota/contracts";
import type { Db } from "../db/client.js";
import { agentRuns } from "../db/schema.js";

export interface StartAgentRunInput {
  teamspaceId: string;
  workflowRunId: string;
  runtimeKind: AgentRuntimeKind;
  taskId?: string | null;
  threadId?: string | null;
  scheduleId?: string | null;
  accountId?: string | null;
  model?: string | null;
}

export interface FinishAgentRunInput {
  status: string;
  usage?: Record<string, unknown>;
}

/**
 * Writer for the durable agent-run telemetry bridge. The workflow opens a run
 * at the start and closes it at the end. Idempotent on `workflowRunId` so a
 * replayed workflow step does not create duplicate rows.
 */
export function createAgentRunPort(db: Db) {
  return {
    async start(input: StartAgentRunInput): Promise<string> {
      const [row] = await db
        .insert(agentRuns)
        .values({
          teamspaceId: input.teamspaceId,
          runtimeKind: input.runtimeKind,
          taskId: input.taskId ?? null,
          threadId: input.threadId ?? null,
          scheduleId: input.scheduleId ?? null,
          workflowRunId: input.workflowRunId,
          accountId: input.accountId ?? null,
          model: input.model ?? null,
          status: "running",
        })
        .onConflictDoNothing({ target: agentRuns.workflowRunId })
        .returning({ id: agentRuns.id });

      if (row) return row.id;

      const existing = await db
        .select({ id: agentRuns.id })
        .from(agentRuns)
        .where(eq(agentRuns.workflowRunId, input.workflowRunId))
        .limit(1);
      return existing[0]!.id;
    },

    async finish(
      workflowRunId: string,
      input: FinishAgentRunInput,
    ): Promise<void> {
      await db
        .update(agentRuns)
        .set({
          status: input.status,
          usage: input.usage ?? {},
          finishedAt: new Date(),
        })
        .where(eq(agentRuns.workflowRunId, workflowRunId));
    },

    /**
     * Has this schedule already produced a run at or after `since`? Used by the
     * cron gate to dedupe: when the heartbeat ticks more often than buffer
     * overlaps allow, a schedule whose previous fire already spawned a run must
     * not spawn a second one for the same tick.
     */
    async hasRunForScheduleSince(
      scheduleId: string,
      since: Date,
    ): Promise<boolean> {
      const rows = await db
        .select({ id: agentRuns.id })
        .from(agentRuns)
        .where(
          and(
            eq(agentRuns.scheduleId, scheduleId),
            gte(agentRuns.startedAt, since),
          ),
        )
        .limit(1);
      return rows.length > 0;
    },
  };
}
