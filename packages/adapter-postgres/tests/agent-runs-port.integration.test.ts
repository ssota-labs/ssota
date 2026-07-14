import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import {
  createConsolePort,
  createDb,
  createAgentRunPort,
  DEFAULT_ORG_SLUG,
  DEFAULT_TEAMSPACE_SLUG,
} from "../src/index.js";
import { agentRuns } from "../src/db/schema.js";

let skip = false;

describe("agent runs port integration (run log + transcript)", () => {
  let teamspaceId: string;
  let db: ReturnType<typeof createDb>["db"];
  let port: ReturnType<typeof createAgentRunPort>;
  const createdRunIds: string[] = [];

  async function startRun(input?: {
    agentDefinitionId?: string | null;
    accountId?: string | null;
  }): Promise<{ runId: string; workflowRunId: string }> {
    const workflowRunId = `test-run-${randomUUID()}`;
    const runId = await port.start({
      teamspaceId,
      workflowRunId,
      runtimeKind: "task",
      trigger: "manual",
      agentDefinitionId: input?.agentDefinitionId ?? null,
      accountId: input?.accountId ?? null,
    });
    createdRunIds.push(runId);
    return { runId, workflowRunId };
  }

  beforeAll(async () => {
    try {
      const dbBundle = createDb();
      db = dbBundle.db;
      const consolePort = createConsolePort(db);
      const org = await consolePort.getOrganizationBySlug(DEFAULT_ORG_SLUG);
      const project = org
        ? await consolePort.getTeamspaceBySlug(org.id, DEFAULT_TEAMSPACE_SLUG)
        : null;
      if (!project) {
        skip = true;
        return;
      }
      teamspaceId = project.id;
      port = createAgentRunPort(db);
    } catch {
      skip = true;
    }
  });

  afterAll(async () => {
    if (skip || createdRunIds.length === 0) return;
    // cascade가 agent_run_messages도 정리한다
    await db.delete(agentRuns).where(inArray(agentRuns.id, createdRunIds));
  });

  it("appendToolEvent is idempotent on (run, toolCallId)", async () => {
    if (skip) return;
    const { runId, workflowRunId } = await startRun();
    const toolCallId = `call-${randomUUID()}`;
    const parts = [
      {
        type: "tool-query_nodes",
        toolCallId,
        state: "output-available",
        input: { catalogKey: "task" },
        output: { rows: [] },
      },
    ];
    await port.appendToolEvent({ workflowRunId, toolCallId, parts });
    await port.appendToolEvent({ workflowRunId, toolCallId, parts });

    const messages = await port.listRunMessages(teamspaceId, runId);
    expect(messages).toHaveLength(1);
    expect(messages[0]!.parts).toEqual(parts);
  });

  it("replaceRunTranscript swaps incremental rows for the canonical transcript", async () => {
    if (skip) return;
    const { runId, workflowRunId } = await startRun();
    await port.appendToolEvent({
      workflowRunId,
      toolCallId: `call-${randomUUID()}`,
      parts: [{ type: "tool-get_task", state: "output-available" }],
    });

    await port.replaceRunTranscript(workflowRunId, [
      {
        role: "assistant",
        parts: [
          { type: "text", text: "결과를 정리했습니다." },
          {
            type: "tool-get_task",
            toolCallId: "call-1",
            state: "output-available",
            input: {},
            output: { id: "t1" },
          },
        ],
      },
      { role: "assistant", parts: [{ type: "text", text: "끝." }] },
    ]);

    const messages = await port.listRunMessages(teamspaceId, runId);
    expect(messages).toHaveLength(2);
    expect(messages[0]!.seq).toBeLessThan(messages[1]!.seq);
    expect(messages[0]!.parts[0]).toEqual({
      type: "text",
      text: "결과를 정리했습니다.",
    });
  });

  it("listRuns paginates newest-first with a keyset cursor", async () => {
    if (skip) return;
    const definitionId = null;
    const runs = [] as string[];
    for (let i = 0; i < 3; i += 1) {
      const { runId } = await startRun({ agentDefinitionId: definitionId });
      runs.push(runId);
    }

    const first = await port.listRuns({ teamspaceId, limit: 2 });
    expect(first.runs.length).toBe(2);
    expect(first.nextCursor).toBeTruthy();

    const second = await port.listRuns({
      teamspaceId,
      limit: 2,
      cursor: first.nextCursor!,
    });
    const firstIds = new Set(first.runs.map((run) => run.id));
    for (const run of second.runs) {
      expect(firstIds.has(run.id)).toBe(false);
    }
  });

  it("mainOnly filters to runs without an agent definition", async () => {
    if (skip) return;
    await startRun({ agentDefinitionId: null });
    const { runs } = await port.listRuns({ teamspaceId, mainOnly: true });
    expect(runs.length).toBeGreaterThan(0);
    for (const run of runs) {
      expect(run.agentDefinitionId).toBeNull();
    }
  });

  it("scopes end-user reads to their account partition", async () => {
    if (skip) return;
    const accountId = randomUUID();
    const otherAccountId = randomUUID();
    const { runId } = await startRun({ accountId });

    const own = await port.listRuns({ teamspaceId, accountId });
    expect(own.runs.some((run) => run.id === runId)).toBe(true);

    const other = await port.listRuns({ teamspaceId, accountId: otherAccountId });
    expect(other.runs.some((run) => run.id === runId)).toBe(false);

    expect(await port.getRun(teamspaceId, runId, otherAccountId)).toBeNull();
  });

  it("rejects cross-teamspace reads (wrong teamspace sees nothing)", async () => {
    if (skip) return;
    const { runId, workflowRunId } = await startRun();
    await port.appendToolEvent({
      workflowRunId,
      toolCallId: `call-${randomUUID()}`,
      parts: [{ type: "tool-get_task", state: "output-available" }],
    });

    const wrongTeamspaceId = randomUUID();
    expect(await port.getRun(wrongTeamspaceId, runId)).toBeNull();
    expect(await port.listRunMessages(wrongTeamspaceId, runId)).toHaveLength(0);
    const { runs } = await port.listRuns({ teamspaceId: wrongTeamspaceId });
    expect(runs.some((run) => run.id === runId)).toBe(false);
  });
});
