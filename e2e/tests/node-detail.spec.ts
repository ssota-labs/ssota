import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { DEFAULT_CONSOLE_BASE, gotoProject } from "../helpers/console";
import { getSmokeInitiativeId } from "../helpers/graph-seed";

test.describe("Node detail", () => {
  test("shows node properties, content, edges, and open in route", async ({
    page,
  }) => {
    const initiativeId = await getSmokeInitiativeId();
    await loginAsSmoke(page);
    await gotoProject(page, `nodes/${initiativeId}`);

    await expect(page.getByRole("textbox", { name: "Title" })).toHaveValue(
      "Smoke initiative",
    );
    await expect(page.getByText("Properties", { exact: true })).toBeVisible();
    await expect(page.getByText("Content", { exact: true })).toBeVisible();
    await expect(page.getByText("Incoming edges", { exact: true })).toBeVisible();
    await expect(page.getByText("Outgoing edges", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Open in route" }).click();
    await expect(page).toHaveURL(
      new RegExp(`${DEFAULT_CONSOLE_BASE}/n/${initiativeId}$`),
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
    expect(href).toMatch(/\/nodes\//);

    await activityLink.click();
    await expect(page).toHaveURL(/\/nodes\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("textbox", { name: "Title" })).toBeVisible();
  });
});
