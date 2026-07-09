import { test, expect } from "@playwright/test";
import { gotoProject } from "../helpers/console";
import { loginAsSmoke } from "../helpers/auth";

test.describe("Work cycle map", () => {
  test("loads single React Flow canvas with cycles collapsed by default", async ({
    page,
  }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "work-cycle");

    await expect(page.getByTestId("work-cycle-workspace")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Work cycles" })).toBeVisible();
    await expect(page.getByText(/cycles,/)).toBeVisible();
    await expect(page.getByText("Work cycle map (A–G)")).toBeVisible();

    // One React Flow canvas — expand/collapse lives on nodes (official RF pattern).
    await expect(page.getByTestId("work-cycle-flow-canvas")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator(".react-flow")).toBeVisible();

    // Cycle nodes present; topology gates hidden until expand.
    await expect(
      page.getByTestId("work-cycle-expand-initiative_planning"),
    ).toBeVisible();
    await expect(page.getByText("PRD ApprovalInbox")).toHaveCount(0);

    await test.info().attach("work-cycle-rf-collapsed", {
      body: await page.screenshot(),
      contentType: "image/png",
    });
  });

  test("expanding cycle node reveals topology gates in the same canvas", async ({
    page,
  }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "work-cycle");

    await expect(page.getByTestId("work-cycle-workspace")).toBeVisible();
    const expand = page.getByTestId("work-cycle-expand-initiative_planning");
    await expect(expand).toBeVisible({ timeout: 15_000 });
    await expand.click();

    // Gates appear inside the same React Flow (hidden → visible).
    await expect(page.getByText("PRD ApprovalInbox")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Feature/Story gate")).toBeVisible();
    await expect(
      page.locator(".react-flow").filter({ hasText: "PRD ApprovalInbox" }),
    ).toBeVisible();

    await test.info().attach("work-cycle-rf-expanded", {
      body: await page.screenshot(),
      contentType: "image/png",
    });
  });
});
