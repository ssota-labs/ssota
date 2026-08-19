import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { gotoProject } from "../helpers/console";

/**
 * Workflows 배선 캔버스 (ADR-aip-console-concepts E) — 시드된 에이전트·워커·finance 액션의
 * 배선이 5종 노드로 그려진다. 실행기가 아니라 "무엇이 무엇을 부를 수 있는가"의 그림이다.
 */

test.describe("Workflows", () => {
  test.slow();

  test("캔버스와 범례가 보인다", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "workflows");
    await expect(page.getByRole("heading", { name: "Workflows" })).toBeVisible();
    for (const kind of ["trigger", "agent", "worker", "action", "gate"]) {
      await expect(page.getByText(kind, { exact: true })).toBeVisible();
    }
    await expect(page.getByTestId("workflow-canvas")).toBeVisible();
  });

  test("액션 노드와 게이트 노드가 그려진다", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "workflows");
    const canvas = page.getByTestId("workflow-canvas");
    await expect(canvas.locator('[data-kind="action"]').first()).toBeVisible();
    // finance.close_period는 gate: true — 관문 노드가 액션 앞에 있다.
    await expect(canvas.locator('[data-kind="gate"]').first()).toBeVisible();
    await expect(canvas.getByText("기간 마감").first()).toBeVisible();
  });

  test("nav에서 Workflows로 이동한다", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "overview");
    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Workflows", exact: true })
      .click();
    await expect(page).toHaveURL(/\/workflows$/);
    await expect(page.getByTestId("workflows-page")).toBeVisible();
  });
});
