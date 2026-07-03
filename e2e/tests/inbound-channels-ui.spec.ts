import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { gotoProject } from "../helpers/console";
import {
  clearInboundSlack,
  seedInboundSlackConnected,
  INBOUND_SLACK_TEAM_ID,
  INBOUND_SLACK_WORKSPACE_NAME,
} from "../helpers/inbound-channels";

const SCREENSHOT_DIR = "/opt/cursor/artifacts/screenshots";

async function openSlackAddTriggerDetail(page: import("@playwright/test").Page) {
  await gotoProject(page, "agents");
  await page.getByTestId("agent-item-a0000000-0000-4000-8000-000000000001").click();
  await page.getByTestId("agent-triggers-add").click();

  const addDialog = page.getByTestId("agent-add-trigger-sidebar-dialog");
  await expect(addDialog).toBeVisible();
  await addDialog.getByTestId("add-trigger-slack:agent_mentioned").click();
  await expect(addDialog.getByText("Agent mentioned").first()).toBeVisible();
  return addDialog;
}

test.describe("inbound-channels-ui", () => {
  test.setTimeout(60_000);

  test("disconnected: channels card and add-trigger gate", async ({ page }) => {
    await clearInboundSlack();
    await loginAsSmoke(page);

    await gotoProject(page, "channels");
    const slackCard = page.getByTestId("channel-card-slack");
    await expect(slackCard).toBeVisible();
    await expect(slackCard.getByText("Not connected")).toBeVisible();
    await expect(page.getByTestId("channel-connect-slack")).toBeVisible();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/channels-slack-disconnected.png`,
      fullPage: true,
    });

    const addDialog = await openSlackAddTriggerDetail(page);
    await expect(
      addDialog.getByTestId("agent-trigger-connect-slack-channel"),
    ).toBeVisible();
    await expect(addDialog.getByText("Open Channels")).toBeVisible();
    await expect(addDialog.getByTestId("add-trigger-confirm")).toBeDisabled();
    await expect(
      addDialog.getByText(/Inbound Slack is not connected/i),
    ).toBeVisible();

    await addDialog.screenshot({
      path: `${SCREENSHOT_DIR}/agent-add-trigger-slack-disconnected.png`,
    });
  });

  test("connected: channels card and add-trigger ready", async ({ page }) => {
    await seedInboundSlackConnected();
    await loginAsSmoke(page);

    await gotoProject(page, "channels");
    const slackCard = page.getByTestId("channel-card-slack");
    await expect(slackCard).toBeVisible();
    await expect(slackCard.getByText("Connected")).toBeVisible();
    await expect(slackCard.getByText(INBOUND_SLACK_WORKSPACE_NAME)).toBeVisible();
    await expect(slackCard.getByText(INBOUND_SLACK_TEAM_ID)).toBeVisible();
    await expect(page.getByTestId("channel-connect-slack")).toHaveCount(0);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/channels-slack-connected.png`,
      fullPage: true,
    });

    const addDialog = await openSlackAddTriggerDetail(page);
    await expect(
      addDialog.getByTestId("agent-trigger-connect-slack-channel"),
    ).toHaveCount(0);
    await expect(addDialog.getByTestId("add-trigger-confirm")).toBeEnabled();
    await expect(
      addDialog.getByText(/creates a Slack user group/i),
    ).toBeVisible();
    await expect(
      addDialog.getByText(/Inbound Slack is not connected/i),
    ).toHaveCount(0);

    await addDialog.screenshot({
      path: `${SCREENSHOT_DIR}/agent-add-trigger-slack-connected.png`,
    });
  });
});
