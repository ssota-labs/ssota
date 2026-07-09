import { test, expect } from "@playwright/test";
import { gotoProject } from "../helpers/console";
import { loginAsSmoke } from "../helpers/auth";

test.describe("Work cycle map", () => {
  test("loads overview with seeded cycles and gate policies", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "work-cycle");

    await expect(page.getByTestId("work-cycle-workspace")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Work cycles" })).toBeVisible();
    await expect(page.getByText(/cycles,/)).toBeVisible();
    await expect(page.getByText("Cycle overview (A–G)")).toBeVisible();

    // React Flow canvas mounts for the overview diagram.
    await expect(page.locator(".react-flow")).toBeVisible({ timeout: 15_000 });

    await test.info().attach("work-cycle-overview", {
      body: await page.screenshot(),
      contentType: "image/png",
    });
  });

  test("drill-in shows topology for a selected cycle", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "work-cycle");

    await expect(page.getByTestId("work-cycle-workspace")).toBeVisible();
    const firstNode = page.locator(".react-flow__node").first();
    await expect(firstNode).toBeVisible({ timeout: 20_000 });

    await firstNode.click();
    await expect(page.getByRole("button", { name: "Back to overview" })).toBeVisible({
      timeout: 10_000,
    });
    // Topology canvas remounts after selection.
    await expect(page.locator(".react-flow").last()).toBeVisible();

    await test.info().attach("work-cycle-topology", {
      body: await page.screenshot(),
      contentType: "image/png",
    });
  });
});
