import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { DEFAULT_CONSOLE_BASE, gotoProject } from "../helpers/console";
import { getSmokePageIdBySlug } from "../helpers/pages-seed";

/**
 * P0 U2 — global Delivery surfaces seeded by the SWDL Domain Pack.
 * Navigate via /p/{id} (canonical) after resolving seeded slugs.
 */
test.describe("SWDL delivery surfaces", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSmoke(page);
  });

  test("backlog shows Board and Table tabs", async ({ page }) => {
    const pageId = await getSmokePageIdBySlug("development/backlog");
    await gotoProject(page, `p/${pageId}`);
    await expect(page).toHaveURL(new RegExp(`${DEFAULT_CONSOLE_BASE}/p/${pageId}`));
    await expect(page.getByRole("tab", { name: "Board" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("tab", { name: "Table" })).toBeVisible();
    await expect(page.getByText("Open", { exact: true }).first()).toBeVisible();
    await page.getByRole("tab", { name: "Table" }).click();
    await expect(page.getByText("Backlog").first()).toBeVisible();
  });

  test("sprints page includes Board tab and task columns", async ({ page }) => {
    const pageId = await getSmokePageIdBySlug("development/sprints");
    await gotoProject(page, `p/${pageId}`);
    await expect(page).toHaveURL(new RegExp(`${DEFAULT_CONSOLE_BASE}/p/${pageId}`));
    await expect(page.getByRole("tab", { name: "Board" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("tab", { name: "Sprints" })).toBeVisible();
    await expect(page.getByText("Open", { exact: true }).first()).toBeVisible();
    await page.getByRole("tab", { name: "Sprints" }).click();
    await expect(page.getByText("Sprints").first()).toBeVisible();
  });

  test("pull-requests inbox renders status table", async ({ page }) => {
    const pageId = await getSmokePageIdBySlug("development/pull-requests");
    await gotoProject(page, `p/${pageId}`);
    await expect(page).toHaveURL(new RegExp(`${DEFAULT_CONSOLE_BASE}/p/${pageId}`));
    await expect(page.getByText("리뷰 인박스").first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Pull requests").first()).toBeVisible();
  });

  test("api-snapshots page is reachable", async ({ page }) => {
    const pageId = await getSmokePageIdBySlug("development/api-snapshots");
    await gotoProject(page, `p/${pageId}`);
    await expect(page).toHaveURL(new RegExp(`${DEFAULT_CONSOLE_BASE}/p/${pageId}`));
    await expect(page.getByText("API snapshots").first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("legacy development/backlog slug redirects to page id", async ({
    page,
  }) => {
    const pageId = await getSmokePageIdBySlug("development/backlog");
    await gotoProject(page, "development/backlog");
    await expect(page).toHaveURL(new RegExp(`${DEFAULT_CONSOLE_BASE}/p/${pageId}`), {
      timeout: 15_000,
    });
  });
});
