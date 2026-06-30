import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { DEFAULT_CONSOLE_BASE, gotoProject } from "../helpers/console";

const MAIN_AGENT_BUTTON = /SSOTA Main Agent/i;

test.describe("Agents", () => {
  test("lists seeded agents and opens settings sheet", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "agents");

    const main = page.getByRole("main");
    await expect(
      main.getByRole("heading", { level: 1, name: "Agents", exact: true }),
    ).toBeVisible();
    await expect(main.getByText("Main", { exact: true })).toBeVisible();
    await expect(main.getByRole("button", { name: MAIN_AGENT_BUTTON })).toBeVisible();

    await main.getByRole("button", { name: MAIN_AGENT_BUTTON }).click();

    const sheet = page.getByTestId("agent-settings-sheet");
    await expect(sheet).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Settings", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByTestId("agent-settings-triggers-card"),
    ).toBeVisible();
    await expect(
      page.getByTestId("agent-settings-instructions-card"),
    ).toBeVisible();
    await expect(page.getByTestId("agent-settings-tools-card")).toBeVisible();
    await expect(page.getByTestId("agent-settings-model-card")).toBeVisible();
  });

  test("opens triggers dialog with chat toggle", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "agents");

    await page.getByRole("button", { name: MAIN_AGENT_BUTTON }).click();
    await page.getByTestId("agent-settings-triggers-card").click();

    await expect(page.getByRole("dialog", { name: "Triggers" })).toBeVisible();
    await expect(page.getByTestId("agent-trigger-chat")).toBeVisible();
  });

  test("sidebar nav link reaches agents", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "overview");

    await page.getByRole("link", { name: /^Agents$|^에이전트$/i }).click();

    await expect(page).toHaveURL(
      new RegExp(`${DEFAULT_CONSOLE_BASE}/agents$`),
    );
    await expect(
      page.getByRole("heading", { level: 1, name: "Agents", exact: true }),
    ).toBeVisible();
  });
});
