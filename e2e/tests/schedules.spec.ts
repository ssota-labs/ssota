import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { DEFAULT_CONSOLE_BASE, gotoProject } from "../helpers/console";

test.describe("Schedules", () => {
  test("shows seeded schedules and opens add-trigger sheet", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "schedules");

    const main = page.getByRole("main");
    await expect(
      main.getByRole("heading", { name: /^Schedules$|^스케줄$/i }),
    ).toBeVisible();
    await expect(main.getByTestId("schedule-list")).toBeVisible();
    await expect(
      main.locator('[data-testid^="schedule-list-item-"]').first(),
    ).toBeVisible();

    await main.getByRole("button", { name: "Add trigger" }).click();

    const sheet = page.getByTestId("schedule-sheet-panel");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("heading", { name: "Add trigger" })).toBeVisible();
    await expect(sheet.getByTestId("schedule-instruction-picker")).toBeVisible();

    await sheet.getByTestId("schedule-instruction-picker").click();
    const pickerContent = page.getByTestId("schedule-instruction-picker-content");
    await expect(pickerContent).toBeVisible();
    await expect(
      pickerContent.locator('[data-testid^="schedule-instruction-item-"]').first(),
    ).toBeVisible();

    await page.getByTestId("schedule-sheet-close").click();
    await expect(sheet).not.toBeVisible();
  });

  test("opens edit popover from schedule list row", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "schedules");

    const firstItem = page
      .locator('[data-testid^="schedule-list-item-"]')
      .first();
    await firstItem.click();

    const popover = page.getByTestId("schedule-edit-popover");
    await expect(popover).toBeVisible();
    await expect(
      popover.getByRole("button", { name: "Save changes" }),
    ).toBeVisible();
    await expect(popover.getByLabel("Every")).toHaveValue("1");

    await firstItem.click();
    await expect(popover).not.toBeVisible();
  });
});
