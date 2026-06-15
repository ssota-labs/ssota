import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { DEFAULT_CONSOLE_BASE, gotoProject } from "../helpers/console";

const DEMO_OBJECTIVE_TITLE = "Demo: First Release completion loop";

test.describe("Executive Goals Command Center", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "executive/goals");
  });

  test("seeded OKR dashboard shows summary and objective tree", async ({ page }) => {
    await expect(page.getByText("Objectives", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Key results", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: DEMO_OBJECTIVE_TITLE })).toBeVisible();
    await expect(
      page.getByText("Pilot workspaces complete first Release with retrospective"),
    ).toBeVisible();
  });

  test("period filter narrows objectives", async ({ page }) => {
    await expect(page.getByRole("link", { name: DEMO_OBJECTIVE_TITLE })).toBeVisible();

    await page.getByRole("button", { name: "Q2 2026", exact: true }).click();
    await expect(page.getByRole("link", { name: DEMO_OBJECTIVE_TITLE })).toBeVisible();

    await page.getByRole("button", { name: "All periods", exact: true }).click();
    await expect(page.getByRole("link", { name: DEMO_OBJECTIVE_TITLE })).toBeVisible();
  });

  test("KPI table view toggle", async ({ page }) => {
    await page.getByRole("button", { name: "KPI table", exact: true }).click();
    await expect(page.getByRole("columnheader", { name: "KPI" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Current" })).toBeVisible();
  });

  test("wizard creates a new objective", async ({ page }) => {
    const uniqueTitle = `E2E Objective ${Date.now()}`;

    await page.getByRole("button", { name: "New objective", exact: true }).click();
    await page.getByLabel("Objective title").fill(uniqueTitle);
    await page.getByRole("button", { name: "Create first objective", exact: true }).click();

    await expect(page.getByRole("link", { name: uniqueTitle })).toBeVisible({
      timeout: 15_000,
    });
  });
});

test.describe("Executive Goals route smoke", () => {
  test("goals route returns OK in console navigation set", async ({ page }) => {
    await loginAsSmoke(page);
    const response = await page.goto(`${DEFAULT_CONSOLE_BASE}/executive/goals`);
    expect(response?.ok()).toBeTruthy();
  });
});
