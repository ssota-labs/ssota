import { test, expect } from "@playwright/test";
import { gotoProject } from "../helpers/console";
import { loginAsSmoke } from "../helpers/auth";

test.describe("Work cycle map", () => {
  test("parent/child subflow mode nests gates inside expanded cycle", async ({
    page,
  }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "work-cycle");

    await expect(page.getByTestId("work-cycle-workspace")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Work cycles" })).toBeVisible();

    // Default mode is parent/child (subflow).
    await expect(page.getByTestId("work-cycle-mode-subflow")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByTestId("work-cycle-flow-canvas-subflow")).toBeVisible({
      timeout: 15_000,
    });

    await expect(
      page.getByTestId("work-cycle-expand-initiative_planning"),
    ).toBeVisible();
    await expect(page.getByText("PRD ApprovalInbox")).toHaveCount(0);

    await test.info().attach("work-cycle-subflow-collapsed", {
      body: await page.screenshot(),
      contentType: "image/png",
    });

    await page.getByTestId("work-cycle-expand-initiative_planning").click();

    await expect(page.getByText("PRD ApprovalInbox")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Feature/Story gate")).toBeVisible();
    // Group parent has grown around children.
    await expect(
      page.getByTestId("work-cycle-group-initiative_planning"),
    ).toBeVisible();

    await test.info().attach("work-cycle-subflow-expanded", {
      body: await page.screenshot(),
      contentType: "image/png",
    });
  });

  test("expand-collapse mode shows gates as flat siblings after expand", async ({
    page,
  }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "work-cycle");

    await page.getByTestId("work-cycle-mode-expand-collapse").click();
    await expect(
      page.getByTestId("work-cycle-flow-canvas-expand"),
    ).toBeVisible({ timeout: 15_000 });

    await page.getByTestId("work-cycle-expand-initiative_planning").click();
    await expect(page.getByText("PRD ApprovalInbox")).toBeVisible({
      timeout: 15_000,
    });
    // Flat mode does not wrap children in a group shell.
    await expect(
      page.getByTestId("work-cycle-group-initiative_planning"),
    ).toHaveCount(0);

    await test.info().attach("work-cycle-expand-mode", {
      body: await page.screenshot(),
      contentType: "image/png",
    });
  });
});
