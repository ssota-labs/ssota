import { and, asc, desc, eq, gte, isNull, lt, or, sql } from "drizzle-orm";
import type { AgentRuntimeKind, AgentTrigger } from "@ssota/contracts";
import type { Db } from "../../db/client.js";
import { agentRunMessages, agentRuns } from "../../db/schema.js";

export interface StartAgentRunInput {
  teamspaceId: string;
  workflowRunId: string;
  runtimeKind: AgentRuntimeKind;
  agentDefinitionId?: string | null;
  trigger?: AgentTrigger | null;
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

export interface AgentRunRecord {
  id: string;
  teamspaceId: string;
  accountId: string | null;
  runtimeKind: AgentRuntimeKind;
  agentDefinitionId: string | null;
  trigger: AgentTrigger | null;
  taskId: string | null;
  threadId: string | null;
  scheduleId: string | null;
  workflowRunId: string;
  status: string;
  model: string | null;
  usage: Record<string, unknown>;
  startedAt: Date;
  finishedAt: Date | null;
}

export interface AgentRunMessageRecord {
  id: string;
  runId: string;
  seq: number;
  role: string;
  parts: unknown[];
  createdAt: Date;
}

export interface ListAgentRunsInput {
  teamspaceId: string;
  /** Truthy → end-user partition filter; omit/null → builder scope (all runs). */
  accountId?: string | null;
  /** Filter to a specialist definition's runs. */
  agentDefinitionId?: string;
  /** Main (code-defined) agent runs: `agent_definition_id IS NULL`. */
  mainOnly?: boolean;
  taskId?: string;
  trigger?: AgentTrigger;
  limit?: number;
  /** Opaque keyset cursor from a previous page's `nextCursor`. */
  cursor?: string;
}

export interface TranscriptMessageInput {
  role: string;
  parts: unknown[];
}

const DEFAULT_LIST_LIMIT = 30;
const MAX_LIST_LIMIT = 100;

function encodeCursor(row: { startedAt: Date; id: string }): string {
  return `${row.startedAt.toISOString()}|${row.id}`;
}

function decodeCursor(
  cursor: string,
): { startedAt: Date; id: string } | null {
  const sep = cursor.lastIndexOf("|");
  if (sep < 0) return null;
  const startedAt = new Date(cursor.slice(0, sep));
  const id = cursor.slice(sep + 1);
  if (Number.isNaN(startedAt.getTime()) || !id) return null;
  return { startedAt, id };
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
          agentDefinitionId: input.agentDefinitionId ?? null,
          trigger: input.trigger ?? null,
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
     * windows allow, only one fan-out per schedule per window should run.
     */
    async hasScheduleRunSince(
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

    async hasWorkflowRun(workflowRunId: string): Promise<boolean> {
      const rows = await db
        .select({ id: agentRuns.id })
        .from(agentRuns)
        .where(eq(agentRuns.workflowRunId, workflowRunId))
        .limit(1);
      return rows.length > 0;
    },

    /**
     * Runs for the run-log UI, newest first with a keyset cursor. Builder scope
     * (accountId 생략) sees every run in the teamspace; end-user scope sees only
     * its own account partition.
     */
    async listRuns(
      input: ListAgentRunsInput,
    ): Promise<{ runs: AgentRunRecord[]; nextCursor: string | null }> {
      const limit = Math.min(input.limit ?? DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT);
      const conditions = [eq(agentRuns.teamspaceId, input.teamspaceId)];
      if (input.accountId) {
        conditions.push(eq(agentRuns.accountId, input.accountId));
      }
      if (input.mainOnly) {
        conditions.push(isNull(agentRuns.agentDefinitionId));
      } else if (input.agentDefinitionId) {
        conditions.push(eq(agentRuns.agentDefinitionId, input.agentDefinitionId));
      }
      if (input.taskId) conditions.push(eq(agentRuns.taskId, input.taskId));
      if (input.trigger) conditions.push(eq(agentRuns.trigger, input.trigger));
      if (input.cursor) {
        const cursor = decodeCursor(input.cursor);
        if (cursor) {
          conditions.push(
            or(
              lt(agentRuns.startedAt, cursor.startedAt),
              and(
                eq(agentRuns.startedAt, cursor.startedAt),
                lt(agentRuns.id, cursor.id),
              ),
            )!,
          );
        }
      }

      const rows = await db
        .select()
        .from(agentRuns)
        .where(and(...conditions))
        .orderBy(desc(agentRuns.startedAt), desc(agentRuns.id))
        .limit(limit + 1);

      const page = rows.slice(0, limit);
      const nextCursor =
        rows.length > limit ? encodeCursor(page[page.length - 1]!) : null;
      return { runs: page as AgentRunRecord[], nextCursor };
    },

    async getRun(
      teamspaceId: string,
      runId: string,
      accountId?: string | null,
    ): Promise<AgentRunRecord | null> {
      const conditions = [
        eq(agentRuns.id, runId),
        eq(agentRuns.teamspaceId, teamspaceId),
      ];
      if (accountId) conditions.push(eq(agentRuns.accountId, accountId));
      const [row] = await db
        .select()
        .from(agentRuns)
        .where(and(...conditions))
        .limit(1);
      return (row as AgentRunRecord | undefined) ?? null;
    },

    /** Transcript rows for one run, scoped through the run's teamspace. */
    async listRunMessages(
      teamspaceId: string,
      runId: string,
      accountId?: string | null,
    ): Promise<AgentRunMessageRecord[]> {
      const conditions = [
        eq(agentRunMessages.runId, runId),
        eq(agentRuns.teamspaceId, teamspaceId),
      ];
      if (accountId) conditions.push(eq(agentRuns.accountId, accountId));
      const rows = await db
        .select({
          id: agentRunMessages.id,
          runId: agentRunMessages.runId,
          seq: agentRunMessages.seq,
          role: agentRunMessages.role,
          parts: agentRunMessages.parts,
          createdAt: agentRunMessages.createdAt,
        })
        .from(agentRunMessages)
        .innerJoin(agentRuns, eq(agentRunMessages.runId, agentRuns.id))
        .where(and(...conditions))
        .orderBy(asc(agentRunMessages.seq));
      return rows;
    },

    /**
     * Incremental per-tool-call event from the durable dispatch step. Idempotent
     * on (run_id, tool_call_id) so WDK step retries do not duplicate rows.
     * No-op when the run row does not exist yet (defensive; claim runs first).
     */
    async appendToolEvent(input: {
      workflowRunId: string;
      toolCallId: string;
      parts: unknown[];
    }): Promise<void> {
      await db.execute(sql`
        insert into agent_run_messages (run_id, role, parts, tool_call_id)
        select id, 'assistant', ${JSON.stringify(input.parts)}::jsonb, ${input.toolCallId}
        from agent_runs where workflow_run_id = ${input.workflowRunId}
        on conflict (run_id, tool_call_id) where tool_call_id is not null
        do nothing
      `);
    },

    /**
     * Replace the run's transcript with the canonical post-run message list
     * (drops incremental tool-event rows). Called inside a durable step, so a
     * retry simply repeats the delete+insert.
     */
    async replaceRunTranscript(
      workflowRunId: string,
      messages: TranscriptMessageInput[],
    ): Promise<void> {
      const [run] = await db
        .select({ id: agentRuns.id })
        .from(agentRuns)
        .where(eq(agentRuns.workflowRunId, workflowRunId))
        .limit(1);
      if (!run) return;
      await db.transaction(async (tx) => {
        await tx
          .delete(agentRunMessages)
          .where(eq(agentRunMessages.runId, run.id));
        if (messages.length === 0) return;
        await tx.insert(agentRunMessages).values(
          messages.map((message) => ({
            runId: run.id,
            role: message.role,
            parts: message.parts,
          })),
        );
      });
    },
  };
}
