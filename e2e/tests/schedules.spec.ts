import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { gotoProject } from "../helpers/console";

test.describe("schedule-hub", () => {
  test("shows agent triggers and worker sync sections", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "schedules");

    const hub = page.getByTestId("schedule-hub");
    await expect(hub).toBeVisible();
    await expect(
      hub.getByRole("heading", { name: /^Schedule hub$|^스케줄 허브$/i }),
    ).toBeVisible();
    await expect(hub.getByText(/^Agent triggers$|^에이전트 트리거$/i)).toBeVisible();
    await expect(hub.getByText(/^Worker sync$|^워커 sync$/i)).toBeVisible();

    await expect(hub.getByTestId("schedule-hub-agent-list")).toBeVisible();
    await expect(
      hub.locator('[data-testid^="schedule-list-item-"]').first(),
    ).toBeVisible();
    await expect(hub.getByText(/^No sync workers yet/i)).toBeVisible();

    await hub.getByRole("button", { name: /Add agent trigger|에이전트 트리거 추가/i }).click();

    const sheet = page.getByTestId("schedule-sheet-panel");
    await expect(sheet).toBeVisible();
    await expect(
      sheet.getByRole("heading", { name: /Add trigger|트리거 추가/i }),
    ).toBeVisible();
    await expect(sheet.getByTestId("schedule-instruction-picker")).toBeVisible();

    await page.getByTestId("schedule-sheet-close").click();
    await expect(sheet).not.toBeVisible();

    await page.screenshot({
      path: "/opt/cursor/artifacts/screenshots/schedule-hub.png",
      fullPage: true,
    });
  });

  test("opens edit sheet from agent trigger row", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "schedules");

    const firstItem = page
      .locator('[data-testid^="schedule-list-item-"]')
      .first();
    await firstItem.getByRole("button").first().click();

    const sheet = page.getByTestId("schedule-sheet-panel");
    await expect(sheet).toBeVisible();
    await expect(
      sheet.getByRole("heading", { name: /Edit trigger|트리거 편집/i }),
    ).toBeVisible();
  });

  test("links to workers for sync management", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "schedules");

    await page.getByTestId("schedule-hub-open-workers").click();
    await expect(page.getByTestId("workers-workspace")).toBeVisible();
  });
});
