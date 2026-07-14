import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { gotoProject } from "../helpers/console";
import { seedMainAgentRunWithTranscript } from "../helpers/agent-runs-seed";

/**
 * 에이전트 디테일 페이지 — 설정/로그 탭 + 실행 로그 테이블 + 런 디테일 시트.
 */
test.describe("Agent detail page", () => {
  let seeded: Awaited<ReturnType<typeof seedMainAgentRunWithTranscript>>;

  test.beforeAll(async () => {
    seeded = await seedMainAgentRunWithTranscript();
  });

  test("settings tab renders the settings cards by default", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "agents");
    await page.getByTestId("main-agent-card").click();

    await expect(page).toHaveURL(/\/agents\/main(\?.*)?$/);
    await expect(page.getByTestId("agent-detail-tab-settings")).toBeVisible();
    await expect(page.getByTestId("agent-detail-tab-logs")).toBeVisible();
    await expect(page.getByTestId("agent-settings-sheet")).toBeVisible();
    await expect(page.getByTestId("agent-settings-save")).toBeVisible();
  });

  test("logs tab lists runs and opens the run transcript sheet", async ({
    page,
  }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "agents");
    await page.getByTestId("main-agent-card").click();

    await page.getByTestId("agent-detail-tab-logs").click();
    await expect(page).toHaveURL(/tab=logs/);
    await expect(page.getByTestId("agent-run-log")).toBeVisible();

    const runRow = page.getByTestId(`agent-run-row-${seeded.runId}`);
    await expect(runRow).toBeVisible();
    await expect(runRow.getByText("done")).toBeVisible();
    await expect(runRow.getByText("Schedule")).toBeVisible();

    await runRow.click();
    const sheet = page.getByTestId("run-detail-sheet");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByTestId("run-transcript")).toBeVisible();
    await expect(sheet.getByText("스케줄 실행을 시작합니다.")).toBeVisible();
    await expect(
      sheet.getByText("처리할 태스크가 없어 종료합니다."),
    ).toBeVisible();
    // 툴콜 그룹 — 펼치면 개별 툴 항목이 보인다
    await sheet.getByTestId("tool-group").click();
    await expect(sheet.getByTestId("tool-trace-query_tasks")).toBeVisible();
  });

  test("logs tab survives reload via ?tab=logs", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "agents");
    await page.getByTestId("main-agent-card").click();
    await page.getByTestId("agent-detail-tab-logs").click();
    await expect(page).toHaveURL(/tab=logs/);

    await page.reload();
    await expect(page.getByTestId("agent-run-log")).toBeVisible();
  });

  test("unknown agent id shows not found", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "agents");
    const url = new URL(page.url());
    await page.goto(`${url.origin}${url.pathname}/00000000-0000-4000-8000-000000000000`);
    await expect(
      page.getByText(/404|could not be found/i).first(),
    ).toBeVisible();
  });
});
