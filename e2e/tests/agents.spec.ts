import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { DEFAULT_CONSOLE_BASE, gotoProject } from "../helpers/console";

const PROJECT_AGENT_CARD = "main-agent-card";

test.describe("Agents", () => {
  test("lists seeded agents and opens settings sheet", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "agents");

    const main = page.getByRole("main");
    await expect(
      main.getByRole("heading", { level: 1, name: "Agents", exact: true }),
    ).toBeVisible();
    await expect(main.getByText("Project agent", { exact: true })).toBeVisible();
    await expect(page.getByTestId(PROJECT_AGENT_CARD)).toBeVisible();

    await page.getByTestId(PROJECT_AGENT_CARD).click();

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

  test("triggers card shows default chat/task and add trigger button", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "agents");

    await page.getByTestId(PROJECT_AGENT_CARD).click();

    const triggersCard = page.getByTestId("agent-settings-triggers-card");
    await expect(triggersCard.getByTestId("agent-trigger-chat")).toBeVisible();
    await expect(triggersCard.getByTestId("agent-trigger-chat").getByRole("switch")).toHaveCount(0);
    await expect(triggersCard.getByTestId("agent-trigger-task").getByRole("switch")).toBeVisible();
    await expect(triggersCard.getByTestId("agent-trigger-chatbot")).not.toBeVisible();
    await expect(
      triggersCard.getByText("Weekly on weekdays at 9:00 AM"),
    ).toBeVisible();
    await expect(triggersCard.getByTestId("agent-triggers-add")).toBeVisible();
  });

  test("opens add-trigger sidebar dialog from footer button", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "agents");

    await page.getByTestId(PROJECT_AGENT_CARD).click();
    await page.getByTestId("agent-triggers-add").click();

    const addDialog = page.getByTestId("agent-add-trigger-sidebar-dialog");
    await expect(addDialog).toBeVisible();
    const nav = addDialog.getByRole("navigation", { name: "Add trigger" });
    await expect(nav.getByText("Schedule", { exact: true })).toBeVisible();
    await expect(nav.getByText("On a schedule")).toBeVisible();
    await expect(addDialog.getByTestId("schedule-inline-form")).toBeVisible();
    await expect(addDialog.getByLabel("Every")).toBeVisible();
    await expect(addDialog.getByTestId("add-trigger-confirm")).toBeVisible();
    await expect(addDialog.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expect(addDialog.getByRole("button", { name: "Done" })).toHaveCount(0);
    await expect(nav.getByText("Slack", { exact: true })).toBeVisible();
    await expect(nav.getByText("Agent mentioned").first()).toBeVisible();
    await expect(nav.getByText("Notion", { exact: true })).not.toBeVisible();
    await expect(nav.getByText("Discord", { exact: true })).not.toBeVisible();
    await expect(
      addDialog.getByText(/Slack user group/i),
    ).toBeVisible();
    await expect(
      addDialog.getByText(/Saved or Later messages/i),
    ).toBeVisible();
  });

  test("frequency select opens inside add-trigger dialog", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "agents");

    await page.getByTestId(PROJECT_AGENT_CARD).click();
    await page.getByTestId("agent-triggers-add").click();

    const addDialog = page.getByTestId("agent-add-trigger-sidebar-dialog");
    await addDialog.locator("#schedule-frequency").click();

    await expect(page.getByRole("option", { name: "Hour" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Day" })).toBeVisible();
    await page.getByRole("option", { name: "Hour" }).click();
    await expect(addDialog.locator("#schedule-frequency")).toContainText("Hour");
  });

  test("opens schedule edit popover with prefilled form", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "agents");

    await page.getByTestId(PROJECT_AGENT_CARD).click();

    const triggersCard = page.getByTestId("agent-settings-triggers-card");
    const scheduleRow = triggersCard.getByRole("button", {
      name: /Weekly on weekdays at 9:00 AM/i,
    });
    await scheduleRow.click();

    const popover = page.getByTestId("schedule-edit-popover");
    await expect(popover).toBeVisible();
    await expect(
      popover.getByRole("button", { name: "Save changes" }),
    ).toBeVisible();
    await expect(popover.getByLabel("Every")).toHaveValue("1");

    await scheduleRow.click();
    await expect(popover).not.toBeVisible();
  });

  test("opens tools dialog with sidebar list", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "agents");

    await page.getByTestId(PROJECT_AGENT_CARD).click();
    await page.getByTestId("agent-tools-manage").click();

    const toolsDialog = page.getByTestId("agent-tools-sidebar-dialog");
    await expect(toolsDialog).toBeVisible();
    await expect(toolsDialog.getByTestId("agent-connector-notion")).toBeVisible();
    await expect(toolsDialog.getByText("Composio connectors")).not.toBeVisible();
    await expect(toolsDialog.getByText("TypeScript scripts")).not.toBeVisible();
  });

  test("settings cards show configured items in footer", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "agents");

    await page.getByTestId(PROJECT_AGENT_CARD).click();

    const toolsCard = page.getByTestId("agent-settings-tools-card");
    await expect(
      toolsCard.getByText("No connectors or scripts selected yet"),
    ).toBeVisible();
    await expect(toolsCard.getByText("Base capabilities")).not.toBeVisible();

    const triggersCard = page.getByTestId("agent-settings-triggers-card");
    await expect(
      triggersCard.getByText("Weekly on weekdays at 9:00 AM"),
    ).toBeVisible();
    await expect(triggersCard.getByTestId("agent-trigger-chat")).toBeVisible();

    const modelCard = page.getByTestId("agent-settings-model-card");
    await expect(modelCard.getByText(/Auto|Claude|GPT/i)).toBeVisible();
  });

  test("shows unsaved state when task trigger is toggled", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "agents");

    await page.getByTestId(PROJECT_AGENT_CARD).click();

    const sheet = page.getByTestId("agent-settings-sheet");
    const saveButton = page.getByTestId("agent-settings-save");
    await expect(saveButton).toBeDisabled();
    await expect(saveButton).toHaveText("Saved");
    await expect(sheet).not.toHaveAttribute("data-unsaved", "true");

    const taskSwitch = page
      .getByTestId("agent-trigger-task")
      .getByRole("switch");
    await taskSwitch.click();

    await expect(sheet).toHaveAttribute("data-unsaved", "true");
    await expect(saveButton).toBeEnabled();
    await expect(saveButton).toHaveText("Save changes");

    await taskSwitch.click();
    await expect(sheet).not.toHaveAttribute("data-unsaved", "true");
    await expect(saveButton).toBeDisabled();
  });

  test("confirms discard when closing with unsaved changes", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "agents");

    await page.getByTestId(PROJECT_AGENT_CARD).click();
    await page
      .getByTestId("agent-trigger-task")
      .getByRole("switch")
      .click();

    await page.getByTestId("card-list-sheet-close").click();

    const dialog = page.getByTestId("agent-settings-discard-dialog");
    await expect(dialog).toBeVisible();
    await page.getByTestId("agent-settings-discard-cancel").click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByTestId("agent-settings-sheet")).toBeVisible();

    await page.getByTestId("card-list-sheet-close").click();
    await expect(dialog).toBeVisible();
    await page.getByTestId("agent-settings-discard-confirm").click();
    await expect(page.getByTestId("agent-settings-sheet")).not.toBeVisible();
  });

  test("closes when clicking outside the sheet", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "agents");

    await page.getByTestId(PROJECT_AGENT_CARD).click();
    await expect(page.getByTestId("agent-settings-sheet")).toBeVisible();

    const workspace = page.getByTestId("agents-workspace");
    const box = await workspace.boundingBox();
    if (!box) throw new Error("agents workspace not visible");
    await page.mouse.click(box.x + 24, box.y + 96);

    await expect(page.getByTestId("agent-settings-sheet")).not.toBeVisible();
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
