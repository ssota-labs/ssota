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

test.describe("inbound-channels-ui", () => {
  test.setTimeout(60_000);

  test("disconnected: channels card", async ({ page }) => {
    await clearInboundSlack();
    await loginAsSmoke(page);

    await gotoProject(page, "channels");
    const slackCard = page.getByTestId("channel-card-slack");
    await expect(slackCard).toBeVisible();
    await expect(slackCard.getByText("Connected")).toHaveCount(0);
    await slackCard.click();
    await expect(page.getByTestId("card-list-sheet-panel")).toBeVisible();
    await expect(page.getByTestId("channel-add-connection-slack")).toBeVisible();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/channels-slack-disconnected.png`,
      fullPage: true,
    });
  });

  test("connected: channels card", async ({ page }) => {
    await seedInboundSlackConnected();
    await loginAsSmoke(page);

    await gotoProject(page, "channels");
    const slackCard = page.getByTestId("channel-card-slack");
    await expect(slackCard).toBeVisible();
    await expect(slackCard.getByText("Connected")).toBeVisible();
    await expect(slackCard.getByText(INBOUND_SLACK_WORKSPACE_NAME)).toBeVisible();
    await slackCard.click();
    await expect(page.getByTestId("card-list-sheet-panel")).toBeVisible();
    await expect(page.getByTestId(`channel-workspace-slack-${INBOUND_SLACK_TEAM_ID}`)).toContainText(
      INBOUND_SLACK_TEAM_ID,
    );
    await expect(page.getByTestId("channel-add-connection-slack")).toBeVisible();
    await expect(
      page.getByTestId(`channel-disconnect-slack-${INBOUND_SLACK_TEAM_ID}`),
    ).toBeVisible();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/channels-slack-connected.png`,
      fullPage: true,
    });
  });

  test("main agent add-trigger dialog omits Slack agent mention", async ({ page }) => {
    await loginAsSmoke(page);

    await gotoProject(page, "agents");
    await page.getByTestId("main-agent-card").click();
    await page.getByTestId("agent-triggers-add").click();

    const addDialog = page.getByTestId("agent-add-trigger-sidebar-dialog");
    await expect(addDialog).toBeVisible();
    const nav = addDialog.getByRole("navigation", { name: "Add trigger" });
    await expect(nav.getByText("Schedule", { exact: true })).toBeVisible();
    await expect(nav.getByText("Slack", { exact: true })).toHaveCount(0);
    await expect(nav.getByText("Agent mentioned").first()).toHaveCount(0);
    await expect(
      addDialog.getByTestId("add-trigger-slack:agent_mentioned"),
    ).toHaveCount(0);
  });

  test("connected: disconnect from channel sheet", async ({ page }) => {
    await seedInboundSlackConnected();
    await loginAsSmoke(page);

    await gotoProject(page, "channels");
    const slackCard = page.getByTestId("channel-card-slack");
    await expect(slackCard.getByText("Connected")).toBeVisible();
    await slackCard.click();
    await expect(
      page.getByTestId(`channel-disconnect-slack-${INBOUND_SLACK_TEAM_ID}`),
    ).toBeVisible();
    await page.getByTestId(`channel-disconnect-slack-${INBOUND_SLACK_TEAM_ID}`).click();
    await expect(page.getByTestId("channel-disconnect-dialog")).toBeVisible();
    await page.getByTestId("channel-disconnect-confirm").click();

    await expect(page.getByTestId("card-list-sheet-panel")).toHaveCount(0);
    await expect(slackCard.getByText("Connected")).toHaveCount(0);

    await slackCard.click();
    await expect(page.getByTestId("channel-add-connection-slack")).toBeVisible();
    await expect(
      page.getByTestId(`channel-disconnect-slack-${INBOUND_SLACK_TEAM_ID}`),
    ).toHaveCount(0);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/channels-slack-after-disconnect.png`,
      fullPage: true,
    });
  });
});
