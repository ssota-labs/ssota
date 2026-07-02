import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { gotoProject } from "../helpers/console";
import { getDefaultProjectId } from "../helpers/mcp";
import {
  buildSlackMessageEvent,
  emulateSlackUserGroupForAgent,
  ensureEmulateSlackMentionTrigger,
  EMULATE_SLACK_CHANNEL_ID,
  EMULATE_SLACK_TEAM_ID,
  postSlackWebhook,
  waitForEmulateSlackBotReply,
} from "../helpers/emulate-slack";

const RESEARCH_AGENT_ID = "a0000000-0000-4000-8000-000000000004";
const RESEARCH_AGENT_NAME = "Research";

test.describe("emulate-slack-agent-mention", () => {
  test("user-group @mention provisions trigger and streams a reply via emulate", async ({
    page,
    baseURL,
  }) => {
    test.setTimeout(120_000);

    const teamspaceId = await getDefaultProjectId();
    const expectedGroup = emulateSlackUserGroupForAgent(RESEARCH_AGENT_NAME);

    await loginAsSmoke(page);

    await page.request.post(`${baseURL}/api/chat/link`, {
      data: {
        platform: "slack",
        workspaceKey: EMULATE_SLACK_TEAM_ID,
        teamspaceId,
        name: "SSOTA Dev",
      },
    });

    await gotoProject(page, "agents");
    await page.getByTestId(`agent-item-${RESEARCH_AGENT_ID}`).click();

    const triggersCard = page.getByTestId("agent-settings-triggers-card");
    const mentionHandle = new RegExp(`@${expectedGroup.handle}`, "i");
    const hasMentionTrigger = await triggersCard
      .getByText(mentionHandle)
      .isVisible()
      .catch(() => false);

    if (!hasMentionTrigger) {
      await triggersCard.getByTestId("agent-triggers-add").click();

      const addDialog = page.getByTestId("agent-add-trigger-sidebar-dialog");
      await addDialog.getByTestId("add-trigger-slack:agent_mentioned").click();
      await addDialog.getByTestId("add-trigger-confirm").click();

      await expect(addDialog).toBeHidden({ timeout: 30_000 });
      await expect(triggersCard.getByText(mentionHandle)).toBeVisible();
    }

    await expect(triggersCard.getByText(mentionHandle)).toBeVisible();

    await page.getByTestId("agent-settings-save").click();
    await expect(page.getByTestId("agent-settings-sheet")).toBeHidden({
      timeout: 30_000,
    });

    await ensureEmulateSlackMentionTrigger(
      teamspaceId,
      RESEARCH_AGENT_ID,
      RESEARCH_AGENT_NAME,
    );

    const mentionText = `Need help <!subteam^${expectedGroup.id}|@${expectedGroup.handle}> with a quick summary`;
    const slackEvent = await buildSlackMessageEvent({ text: mentionText });
    const webhookResponse = await postSlackWebhook(baseURL!, slackEvent);
    expect(webhookResponse.ok).toBeTruthy();

    const botMessages = await waitForEmulateSlackBotReply({
      channelId: EMULATE_SLACK_CHANNEL_ID,
      threadTs: slackEvent.event.ts,
      predicate: (messages) =>
        messages.some((message) => (message.text ?? "").trim().length > 0),
    });

    expect(botMessages.length).toBeGreaterThan(0);
    expect(botMessages.at(-1)?.text?.trim().length ?? 0).toBeGreaterThan(0);
  });
});
