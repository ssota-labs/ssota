import { test, expect } from "@playwright/test";
import { gotoProject } from "../helpers/console";
import { loginAsSmoke } from "../helpers/auth";

test.describe("Work cycle map", () => {
  test("loads overview with accordion cycles collapsed by default", async ({
    page,
  }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "work-cycle");

    await expect(page.getByTestId("work-cycle-workspace")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Work cycles" })).toBeVisible();
    await expect(page.getByText(/cycles,/)).toBeVisible();
    await expect(page.getByText("Cycle overview (A–G)")).toBeVisible();
    await expect(page.getByText("Cycle detail")).toBeVisible();

    // Overview React Flow mounts.
    await expect(page.locator(".react-flow").first()).toBeVisible({
      timeout: 15_000,
    });

    // Accordion rows exist but topology is not mounted while collapsed.
    await expect(
      page.getByTestId("work-cycle-trigger-initiative_planning"),
    ).toBeVisible();
    await expect(page.getByText("Back to overview")).toHaveCount(0);
    await expect(
      page.locator(".react-flow").filter({ hasText: "PRD ApprovalInbox" }),
    ).toHaveCount(0);

    await test.info().attach("work-cycle-overview-collapsed", {
      body: await page.screenshot(),
      contentType: "image/png",
    });
  });

  test("expanding accordion shows topology with gate nodes", async ({
    page,
  }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "work-cycle");

    await expect(page.getByTestId("work-cycle-workspace")).toBeVisible();
    const trigger = page.getByTestId("work-cycle-trigger-initiative_planning");
    await expect(trigger).toBeVisible();
    await trigger.click();

    // Topology canvas for the open cycle (gate labels from seed).
    await expect(page.getByText("PRD ApprovalInbox")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Feature/Story gate")).toBeVisible();
    await expect(
      page.locator(".react-flow").filter({ hasText: "PRD ApprovalInbox" }),
    ).toBeVisible();

    await test.info().attach("work-cycle-accordion-topology", {
      body: await page.screenshot(),
      contentType: "image/png",
    });
  });
});
