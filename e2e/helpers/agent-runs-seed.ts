import { randomUUID } from "node:crypto";
import {
  createAgentRunPort,
  createConsolePort,
  createDb,
  DEFAULT_ORG_SLUG,
  DEFAULT_TEAMSPACE_SLUG,
} from "@ssota/adapter-postgres";

/** agents-detail/tasks-run-log 스펙용 — 완료된 main 런 1건 + 트랜스크립트 시드. */
export async function seedMainAgentRunWithTranscript(): Promise<{
  workflowRunId: string;
  runId: string;
  teamspaceId: string;
}> {
  const databaseUrl =
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

  const { db } = createDb(databaseUrl);
  const consolePort = createConsolePort(db);
  const org = await consolePort.getOrganizationBySlug(DEFAULT_ORG_SLUG);
  if (!org) throw new Error("Default org not found — run db:seed");
  const teamspace = await consolePort.getTeamspaceBySlug(
    org.id,
    DEFAULT_TEAMSPACE_SLUG,
  );
  if (!teamspace) throw new Error("Default teamspace not found — run db:seed");

  const port = createAgentRunPort(db);
  const workflowRunId = `e2e-run-${randomUUID()}`;
  const runId = await port.start({
    teamspaceId: teamspace.id,
    workflowRunId,
    runtimeKind: "main",
    trigger: "schedule",
    model: "stub/model",
  });
  await port.replaceRunTranscript(workflowRunId, [
    {
      role: "assistant",
      parts: [
        { type: "text", text: "스케줄 실행을 시작합니다." },
        {
          type: "tool-query_tasks",
          toolCallId: "e2e-call-1",
          state: "output-available",
          input: { status: "ready" },
          output: { tasks: [] },
        },
      ],
    },
    {
      role: "assistant",
      parts: [{ type: "text", text: "처리할 태스크가 없어 종료합니다." }],
    },
  ]);
  await port.finish(workflowRunId, {
    status: "done",
    usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
  });

  return { workflowRunId, runId, teamspaceId: teamspace.id };
}
