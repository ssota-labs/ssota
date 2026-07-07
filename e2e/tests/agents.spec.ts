import { test, expect } from "@playwright/test";
import { resetMainAgentConnectorBindingSeed } from "../helpers/agent-main-config";
import { loginAsSmoke } from "../helpers/auth";
import { DEFAULT_CONSOLE_BASE, gotoProject } from "../helpers/console";

import { BUILTIN_AGENT_IDS } from "@ssota/contracts/agents";

const PROJECT_AGENT_CARD = "main-agent-card";
const TASK_AGENT_CARD = `agent-item-${BUILTIN_AGENT_IDS.implementFeature}`;

test.describe("Agents", () => {
  test.beforeAll(async () => {
    await resetMainAgentConnectorBindingSeed();
  });

  test.afterAll(async () => {
    await resetMainAgentConnectorBindingSeed();
  });

  test("agent browse list cards use transparent background", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "agents");

    const main = page.getByRole("main");
    const listCards = main.locator(
      ".divide-y.divide-border.overflow-hidden.rounded-lg.border",
    );
    await expect(listCards.first()).toHaveClass(/bg-transparent/);
    await expect(listCards.first()).not.toHaveClass(/bg-card/);
  });

  test("lists seeded agents and opens settings sheet", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "agents");

    const main = page.getByRole("main");
    await expect(
      main.getByRole("heading", { level: 1, name: "Agents", exact: true }),
    ).toBeVisible();
    await expect(
      main.getByRole("heading", { name: "Project agent", exact: true }),
    ).toBeVisible();
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
    await expect(page.getByTestId("agent-settings-skills-card")).toBeVisible();
    await expect(page.getByTestId("agent-settings-advanced-card")).toBeVisible();
  });

  test("triggers card shows default chat and add trigger button", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "agents");

    await page.getByTestId(PROJECT_AGENT_CARD).click();

    const triggersCard = page.getByTestId("agent-settings-triggers-card");
    await expect(triggersCard.getByTestId("agent-trigger-chat")).toBeVisible();
    await expect(triggersCard.getByTestId("agent-trigger-chat").getByRole("switch")).toHaveCount(0);
    await expect(triggersCard.getByTestId("agent-trigger-task")).toHaveCount(0);
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
    await expect(nav.getByText("Slack", { exact: true })).toHaveCount(0);
    await expect(nav.getByText("Agent mentioned").first()).toHaveCount(0);
    await expect(nav.getByText("Notion", { exact: true })).not.toBeVisible();
    await expect(nav.getByText("Discord", { exact: true })).not.toBeVisible();
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
      popover.getByRole("button", { name: "Save" }),
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
    await expect(toolsDialog.getByText("Connect", { exact: true })).toBeVisible();
    await expect(toolsDialog.getByText("On this agent")).not.toBeVisible();
    await expect(toolsDialog.getByTestId("agent-connect-notion")).toBeVisible();
    await expect(toolsDialog.getByText("Pages")).not.toBeVisible();

    await toolsDialog.getByTestId("agent-connect-notion").click();
    await expect(toolsDialog.getByTestId("agent-connect-section-user")).toBeVisible();
    await expect(
      toolsDialog.getByTestId("agent-connection-remove-user-seed-notion-user-1"),
    ).toBeVisible();
    await expect(
      toolsDialog.getByTestId("agent-connection-add-user-seed-notion-user-2"),
    ).toBeVisible();
    await expect(
      toolsDialog.getByTestId("agent-connect-manage-notion"),
    ).toBeVisible();
    await expect(
      toolsDialog.getByTestId("agent-connect-scope-notion-user"),
    ).toHaveCount(0);
  });

  test("opens skills dialog with sidebar list", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "agents");

    await page.getByTestId(PROJECT_AGENT_CARD).click();
    await page.getByTestId("agent-skills-manage").click();

    const skillsDialog = page.getByTestId("agent-skills-sidebar-dialog");
    await expect(skillsDialog).toBeVisible();
    await expect(
      skillsDialog.getByRole("button", { name: "Done" }),
    ).toBeVisible();
    await expect(
      page.getByTestId("agent-settings-skills-card").getByText("Save bindings"),
    ).not.toBeVisible();
  });

  test("opens model picker popover in Advanced card", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "agents");

    await page.getByTestId(PROJECT_AGENT_CARD).click();

    const advancedCard = page.getByTestId("agent-settings-advanced-card");
    await expect(advancedCard.getByText("Advanced", { exact: true })).toBeVisible();
    await expect(advancedCard.getByTestId("agent-advanced-model-row")).toBeVisible();

    await advancedCard.getByTestId("agent-model-picker").click();
    const picker = page.getByTestId("agent-model-picker-content");
    await expect(picker).toBeVisible();
    await expect(
      picker.getByTestId("agent-model-option-anthropic--claude-sonnet-4.6"),
    ).toBeVisible();
    await expect(page.getByTestId("agent-model-change")).toHaveCount(0);
  });

  test("settings cards show configured items in footer", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "agents");

    await page.getByTestId(PROJECT_AGENT_CARD).click();

    const toolsCard = page.getByTestId("agent-settings-tools-card");
    await expect(
      toolsCard.getByTestId("agent-bound-connection-user-seed-notion-user-1"),
    ).toBeVisible();
    await expect(
      toolsCard.getByText("Alex — Personal Workspace"),
    ).toBeVisible();
    await expect(
      toolsCard.getByText("No connectors or scripts selected yet"),
    ).not.toBeVisible();

    const triggersCard = page.getByTestId("agent-settings-triggers-card");
    await expect(
      triggersCard.getByText("Weekly on weekdays at 9:00 AM"),
    ).toBeVisible();
    await expect(triggersCard.getByTestId("agent-trigger-chat")).toBeVisible();

    const advancedCard = page.getByTestId("agent-settings-advanced-card");
    await expect(advancedCard.getByTestId("agent-model-picker")).toBeVisible();
    await expect(advancedCard.getByText(/Claude|GPT|Gemini/i)).toBeVisible();
  });

  test("shows unsaved state when task trigger is toggled", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "agents");

    await page.getByTestId(TASK_AGENT_CARD).click();

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

    await page.getByTestId(TASK_AGENT_CARD).click();
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

  test("opens tool permissions popover from bound connection row", async ({
    page,
  }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "agents");

    await page.getByTestId(PROJECT_AGENT_CARD).click();

    const toolsCard = page.getByTestId("agent-settings-tools-card");
    await toolsCard
      .getByTestId("agent-bound-connection-settings-user-seed-notion-user-1")
      .click();

    const popover = page.getByTestId("agent-tool-permissions-popover");
    await expect(popover).toBeVisible();
    await expect(popover.getByText("Tool permissions")).toBeVisible();
    await expect(
      popover.getByTestId(
        "agent-tool-permissions-popover-user-seed-notion-user-1",
      ),
    ).toBeVisible();
    await expect(
      popover.getByTestId("agent-tool-permission-row-NOTION_SEARCH_NOTION_PAGE"),
    ).toBeVisible();
    await expect(
      popover.getByText("Search Notion pages and databases"),
    ).toBeVisible();
  });

  test("agent tool permissions show Connections disabled hint", async ({
    page,
  }) => {
    const disabledToolSlug = "NOTION_SEARCH_NOTION_PAGE";
    const orgConnectionId = "seed-notion-org-1";

    await loginAsSmoke(page);
    await gotoProject(page, "agents");

    await page.getByTestId(PROJECT_AGENT_CARD).click();
    await page.getByTestId("agent-tools-manage").click();

    const toolsDialog = page.getByTestId("agent-tools-sidebar-dialog");
    await expect(toolsDialog).toBeVisible();
    await toolsDialog.getByTestId("agent-connect-notion").click();
    const addOrgBinding = toolsDialog.getByTestId(
      `agent-connection-add-org-${orgConnectionId}`,
    );
    if (await addOrgBinding.isVisible()) {
      await addOrgBinding.click();
    }
    await toolsDialog.getByRole("button", { name: "Done" }).click();
    await expect(toolsDialog).not.toBeVisible();
    await page.getByTestId("agent-settings-save").click();
    await expect(page.getByTestId("agent-settings-save")).toBeDisabled();

    await gotoProject(page, "connections");

    await page.getByTestId("connector-notion").click();
    await page
      .getByTestId(`connection-tool-settings-org-${orgConnectionId}`)
      .click();

    const connectionsPopover = page.getByTestId(
      `connection-tool-permissions-popover-org-${orgConnectionId}`,
    );
    await expect(connectionsPopover).toBeVisible();

    const connectionsToolRow = connectionsPopover.getByTestId(
      `connection-tool-permission-row-${disabledToolSlug}`,
    );
    const connectionsSwitch = connectionsToolRow.getByRole("switch");
    if ((await connectionsSwitch.getAttribute("aria-checked")) === "true") {
      await connectionsSwitch.click();
      await expect(connectionsSwitch).toHaveAttribute("aria-checked", "false");
    }

    await page.keyboard.press("Escape");
    await page.getByTestId("card-list-sheet-close").click();

    await gotoProject(page, "agents");
    await page.getByTestId(PROJECT_AGENT_CARD).click();

    const toolsCard = page.getByTestId("agent-settings-tools-card");
    await toolsCard
      .getByTestId(`agent-bound-connection-settings-org-${orgConnectionId}`)
      .click();

    const popover = page.getByTestId("agent-tool-permissions-popover");
    await expect(popover).toBeVisible();
    await expect(
      popover.getByTestId("agent-tool-permissions-connections-hint"),
    ).toBeVisible();
    await expect(
      popover.getByTestId(
        `agent-tool-permission-connections-disabled-${disabledToolSlug}`,
      ),
    ).toHaveText("Disabled in Connections");

    await page.keyboard.press("Escape");
    await gotoProject(page, "connections");
    await page.getByTestId("connector-notion").click();
    await page
      .getByTestId(`connection-tool-settings-org-${orgConnectionId}`)
      .click();
    await expect(connectionsPopover).toBeVisible();
    const restoreSwitch = connectionsPopover
      .getByTestId(`connection-tool-permission-row-${disabledToolSlug}`)
      .getByRole("switch");
    if ((await restoreSwitch.getAttribute("aria-checked")) === "false") {
      await restoreSwitch.click();
    }
    await page.keyboard.press("Escape");
    await page.getByTestId("card-list-sheet-close").click();

    await gotoProject(page, "agents");
    await page.getByTestId(PROJECT_AGENT_CARD).click();
    await toolsCard
      .getByTestId(`agent-bound-connection-unlink-org-${orgConnectionId}`)
      .click();
    await page.getByTestId("agent-settings-save").click();
    await expect(page.getByTestId("agent-settings-save")).toBeDisabled();
  });

  test("connection tool permissions are isolated per connected account", async ({
    page,
  }) => {
    const disabledToolSlug = "NOTION_SEARCH_NOTION_PAGE";

    await loginAsSmoke(page);
    await gotoProject(page, "connections");

    await page.getByTestId("connector-notion").click();

    await page
      .getByTestId("connection-tool-settings-org-seed-notion-org-1")
      .click();
    const org1Popover = page.getByTestId(
      "connection-tool-permissions-popover-org-seed-notion-org-1",
    );
    await expect(org1Popover).toBeVisible();
    const org1Switch = org1Popover
      .getByTestId(`connection-tool-permission-row-${disabledToolSlug}`)
      .getByRole("switch");
    if ((await org1Switch.getAttribute("aria-checked")) === "true") {
      await org1Switch.click();
      await expect(org1Switch).toHaveAttribute("aria-checked", "false");
    }
    await page.keyboard.press("Escape");

    await page
      .getByTestId("connection-tool-settings-org-seed-notion-org-2")
      .click();
    const org2Popover = page.getByTestId(
      "connection-tool-permissions-popover-org-seed-notion-org-2",
    );
    await expect(org2Popover).toBeVisible();
    const org2Switch = org2Popover
      .getByTestId(`connection-tool-permission-row-${disabledToolSlug}`)
      .getByRole("switch");
    await expect(org2Switch).toHaveAttribute("aria-checked", "true");

    await page.keyboard.press("Escape");

    await page
      .getByTestId("connection-tool-settings-org-seed-notion-org-1")
      .click();
    await expect(org1Popover).toBeVisible();
    await expect(org1Switch).toHaveAttribute("aria-checked", "false");

    if ((await org1Switch.getAttribute("aria-checked")) === "false") {
      await org1Switch.click();
      await expect(org1Switch).toHaveAttribute("aria-checked", "true");
    }
    await page.keyboard.press("Escape");
    await page.getByTestId("card-list-sheet-close").click();
  });

  test("unlinks bound connection from tools card and persists on save", async ({
    page,
  }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "agents");

    await page.getByTestId(PROJECT_AGENT_CARD).click();

    const toolsCard = page.getByTestId("agent-settings-tools-card");
    const boundRow = toolsCard.getByTestId(
      "agent-bound-connection-user-seed-notion-user-1",
    );
    await expect(boundRow).toBeVisible();

    await toolsCard
      .getByTestId("agent-bound-connection-unlink-user-seed-notion-user-1")
      .click();

    await expect(boundRow).not.toBeVisible();
    await expect(page.getByTestId("agent-settings-sheet")).toHaveAttribute(
      "data-unsaved",
      "true",
    );

    await page.getByTestId("agent-settings-save").click();
    await expect(page.getByTestId("agent-settings-save")).toBeDisabled();

    await page.getByTestId("card-list-sheet-close").click();
    await expect(page.getByTestId("agent-settings-sheet")).not.toBeVisible();

    await page.getByTestId(PROJECT_AGENT_CARD).click();
    await expect(
      toolsCard.getByTestId("agent-bound-connection-user-seed-notion-user-1"),
    ).not.toBeVisible();
  });

  test("header shows create agent button instead of open skills link", async ({
    page,
  }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "agents");

    await expect(page.getByTestId("agents-create-button")).toBeVisible();
    await expect(page.getByRole("link", { name: "Open Skills" })).toHaveCount(0);
  });

  test("creates agent from header button and opens settings sheet", async ({
    page,
  }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "agents");

    const agentName = `E2E Agent ${Date.now()}`;
    await page.getByTestId("agents-create-button").click();

    const sheet = page.getByTestId("agent-settings-sheet");
    await expect(sheet).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Create agent", exact: true }),
    ).toBeVisible();
    await sheet.getByTestId("agent-settings-name").fill(agentName);
    await sheet
      .getByTestId("agent-settings-description")
      .fill("Use for automated E2E agent creation tests.");
    await page.getByTestId("agent-settings-save").click();

    await expect(sheet).not.toBeVisible();
    await expect(
      page.getByRole("main").locator("span.text-sm.font-medium", {
        hasText: agentName,
      }),
    ).toBeVisible();
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
