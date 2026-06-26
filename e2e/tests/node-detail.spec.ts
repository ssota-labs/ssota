import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { DEFAULT_CONSOLE_BASE, gotoProject } from "../helpers/console";
import { getSmokeHypothesisId } from "../helpers/graph-seed";

test.describe("Node detail", () => {
  test("shows node properties, content, edges, and open in route", async ({
    page,
  }) => {
    const hypothesisId = await getSmokeHypothesisId();
    await loginAsSmoke(page);
    await gotoProject(page, `n/${hypothesisId}`);

    await expect(page.getByRole("textbox", { name: "Title" })).toHaveValue(
      "Smoke hypothesis",
    );
    await expect(page.getByText("Properties", { exact: true })).toBeVisible();
    await expect(page.getByText("Content", { exact: true })).toBeVisible();
    await expect(page.getByText("Incoming edges", { exact: true })).toBeVisible();
    await expect(page.getByText("Outgoing edges", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Open in route" }).click();
    await expect(page).toHaveURL(
      new RegExp(`${DEFAULT_CONSOLE_BASE}/n/${hypothesisId}$`),
    );
  });

  test("overview recent activity links to node detail", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "overview");

    const activityLink = page
      .getByRole("main")
      .getByRole("list")
      .getByRole("link")
      .first();
    const href = await activityLink.getAttribute("href");
    expect(href).toMatch(/\/n\//);

    await activityLink.click();
    await expect(page).toHaveURL(/\/n\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("textbox", { name: "Title" })).toBeVisible();
  });
});
