import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import {
  createAgentRunPort,
  createConsolePort,
  createDb,
  createTaskPort,
  DEFAULT_ORG_SLUG,
  DEFAULT_TEAMSPACE_SLUG,
} from "@ssota/adapter-postgres";
import { loginAsSmoke } from "../helpers/auth";
import { gotoProject } from "../helpers/console";

/** Task 시트 실행 로그 — 태스크에 연결된 런 + 트랜스크립트 시드. */
async function seedTaskWithRun(): Promise<{ taskId: string; runId: string }> {
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

  const taskPort = createTaskPort(db, { teamspaceId: teamspace.id });
  const task = await taskPort.createTask({
    title: `E2E run-log task ${randomUUID().slice(0, 8)}`,
    executorType: "Agent",
    assignee: "agent",
    status: "done",
  });

  const runPort = createAgentRunPort(db);
  const workflowRunId = `e2e-task-run-${randomUUID()}`;
  const runId = await runPort.start({
    teamspaceId: teamspace.id,
    workflowRunId,
    runtimeKind: "task",
    trigger: "task",
    taskId: task.id,
    model: "stub/model",
  });
  await runPort.replaceRunTranscript(workflowRunId, [
    {
      role: "assistant",
      parts: [
        { type: "text", text: "태스크를 처리합니다." },
        {
          type: "tool-get_task",
          toolCallId: "e2e-task-call-1",
          state: "output-available",
          input: { taskId: task.id },
          output: { id: task.id },
        },
      ],
    },
  ]);
  await runPort.finish(workflowRunId, {
    status: "done",
    usage: { totalTokens: 42 },
  });

  return { taskId: task.id, runId };
}

test.describe("Task execution log", () => {
  let seeded: Awaited<ReturnType<typeof seedTaskWithRun>>;

  test.beforeAll(async () => {
    seeded = await seedTaskWithRun();
  });

  test("task sheet shows the run list and opens the transcript", async ({
    page,
  }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "tasks");

    await page.getByText(seeded.taskId.slice(0, 6)).first().click();

    const sheet = page.getByTestId("tasks-detail-sheet");
    await expect(sheet).toBeVisible();

    const runRow = page.getByTestId(`task-run-row-${seeded.runId}`);
    await expect(runRow).toBeVisible();
    await expect(runRow.getByText("done")).toBeVisible();

    await runRow.click();
    const runSheet = page.getByTestId("run-detail-sheet");
    await expect(runSheet).toBeVisible();
    await expect(runSheet.getByText("태스크를 처리합니다.")).toBeVisible();
    await runSheet.getByTestId("tool-group").click();
    await expect(runSheet.getByTestId("tool-trace-get_task")).toBeVisible();
  });
});
