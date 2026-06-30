import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { DEFAULT_CONSOLE_BASE, gotoProject } from "../helpers/console";

test.describe("Agents", () => {
  test("lists seeded agents and opens editor sheet", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "agents");

    const main = page.getByRole("main");
    await expect(
      main.getByRole("heading", { name: "Agents", exact: true }),
    ).toBeVisible();
    await expect(main.getByText("Main", { exact: true })).toBeVisible();
    await expect(main.getByTestId("agent-item-main.ssota")).toBeVisible();

    await main.getByTestId("agent-item-main.ssota").click();

    const sheet = page.getByTestId("document-sheet-panel");
    await expect(sheet).toBeVisible();
    await expect(
      sheet.getByRole("heading", { name: "SSOTA Main Agent" }),
    ).toBeVisible();
    await expect(sheet.getByTestId("document-sheet-editor")).toBeVisible();
  });

  test("sidebar nav link reaches agents", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "overview");

    await page.getByRole("link", { name: /^Agents$|^에이전트$/i }).click();

    await expect(page).toHaveURL(
      new RegExp(`${DEFAULT_CONSOLE_BASE}/agents$`),
    );
    await expect(
      page.getByRole("heading", { name: "Agents", exact: true }),
    ).toBeVisible();
  });
});
