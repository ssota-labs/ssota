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
    await expect(page.getByTestId("agent-instructions-editor")).toBeVisible();
    await expect(page.getByTestId("agent-settings-tools-card")).toBeVisible();
    await expect(page.getByTestId("agent-settings-model-card")).toBeVisible();
  });

  test("triggers card shows inline switches and add schedule", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "agents");

    await page.getByRole("button", { name: MAIN_AGENT_BUTTON }).click();

    const triggersCard = page.getByTestId("agent-settings-triggers-card");
    await expect(triggersCard.getByTestId("agent-trigger-chatbot")).toBeVisible();
    await expect(triggersCard.getByTestId("agent-trigger-task")).not.toBeVisible();
    await expect(
      triggersCard.getByText("Weekly on weekdays at 9:00 AM"),
    ).toBeVisible();
    await expect(triggersCard.getByTestId("agent-triggers-add-schedule")).toBeVisible();
  });

  test("opens triggers dialog from card header", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "agents");

    await page.getByRole("button", { name: MAIN_AGENT_BUTTON }).click();
    await page
      .getByTestId("agent-settings-triggers-card")
      .getByRole("button")
      .first()
      .click();

    const triggersDialog = page.getByTestId("agent-triggers-sidebar-dialog");
    await expect(triggersDialog).toBeVisible();
    await expect(triggersDialog.getByTestId("agent-trigger-schedule")).toBeVisible();
    await expect(
      triggersDialog.getByText("Weekly on weekdays at 9:00 AM"),
    ).toBeVisible();
  });

  test("opens tools dialog with sidebar list", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "agents");

    await page.getByRole("button", { name: MAIN_AGENT_BUTTON }).click();
    await page
      .getByTestId("agent-settings-tools-card")
      .getByRole("button")
      .first()
      .click();

    const toolsDialog = page.getByTestId("agent-tools-sidebar-dialog");
    await expect(toolsDialog).toBeVisible();
    await expect(toolsDialog.getByTestId("agent-connector-notion")).toBeVisible();
    await expect(toolsDialog.getByText("Composio connectors")).not.toBeVisible();
    await expect(toolsDialog.getByText("TypeScript scripts")).not.toBeVisible();
  });

  test("settings cards show configured items in footer", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "agents");

    await page.getByRole("button", { name: MAIN_AGENT_BUTTON }).click();

    const toolsCard = page.getByTestId("agent-settings-tools-card");
    await expect(
      toolsCard.getByText("No connectors or scripts selected yet"),
    ).toBeVisible();
    await expect(toolsCard.getByText("Base capabilities")).not.toBeVisible();

    const triggersCard = page.getByTestId("agent-settings-triggers-card");
    await expect(
      triggersCard.getByText("Weekly on weekdays at 9:00 AM"),
    ).toBeVisible();
    await expect(
      triggersCard.getByText("Web chat", { exact: false }),
    ).not.toBeVisible();

    const modelCard = page.getByTestId("agent-settings-model-card");
    await expect(modelCard.getByText(/Auto|Claude|GPT/i)).toBeVisible();
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
