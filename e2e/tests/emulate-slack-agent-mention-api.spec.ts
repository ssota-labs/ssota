import { test, expect } from "@playwright/test";
import { createChatWorkspacePort, createDb } from "@ssota/adapter-postgres";
import { getDefaultProjectId } from "../helpers/mcp";
import {
  buildSlackMessageEvent,
  ensureEmulateSlackMentionTrigger,
  postSlackWebhook,
  waitForEmulateSlackBotReply,
  EMULATE_SLACK_TEAM_ID,
} from "../helpers/emulate-slack";

const RESEARCH_AGENT_ID = "a0000000-0000-4000-8000-000000000004";
const RESEARCH_AGENT_NAME = "Research";

test.describe("emulate-slack-agent-mention-api", () => {
  test("signed webhook routes mention to specialist and posts thread reply", async ({
    baseURL,
  }) => {
    test.setTimeout(120_000);

    const teamspaceId = await getDefaultProjectId();
    const { db, client } = createDb(
      process.env.DATABASE_URL ??
        "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
    );
    try {
      await createChatWorkspacePort(db).link({
        teamspaceId,
        accountId: null,
        platform: "slack",
        workspaceKey: EMULATE_SLACK_TEAM_ID,
        name: "SSOTA Dev",
      });
    } finally {
      await client.end();
    }

    const group = await ensureEmulateSlackMentionTrigger(
      teamspaceId,
      RESEARCH_AGENT_ID,
      RESEARCH_AGENT_NAME,
    );

    const slackEvent = await buildSlackMessageEvent({
      text: `Need help <!subteam^${group.id}|@${group.handle}> with a quick summary`,
    });

    const started = Date.now();
    const webhookResponse = await postSlackWebhook(baseURL!, slackEvent);
    const webhookBody = await webhookResponse.text();
    const elapsed = Date.now() - started;

    expect(webhookResponse.ok, webhookBody).toBeTruthy();
    expect(elapsed, `webhook should await inbound agent processing (${elapsed}ms)`).toBeGreaterThan(
      2_000,
    );

    const botMessages = await waitForEmulateSlackBotReply({
      threadTs: slackEvent.event.ts,
      predicate: (messages) =>
        messages.some((message) => (message.text ?? "").trim().length > 0),
    });

    expect(botMessages.length).toBeGreaterThan(0);
    expect(botMessages.at(-1)?.text?.trim().length ?? 0).toBeGreaterThan(0);
  });
});
