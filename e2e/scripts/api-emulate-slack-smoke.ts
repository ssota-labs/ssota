import { createChatWorkspacePort, createDb } from "@ssota/adapter-postgres";
import {
  buildSlackMessageEvent,
  ensureEmulateSlackMentionTrigger,
  postSlackWebhook,
  waitForEmulateSlackBotReply,
  EMULATE_SLACK_TEAM_ID,
} from "../helpers/emulate-slack";

const TEAMSPACE = "ac26abf1-2503-4ea3-b73e-5a05461874ab";
const RESEARCH = "a0000000-0000-4000-8000-000000000004";
const WEB = process.env.WEB_URL ?? "http://127.0.0.1:3100";

async function main() {
  const { db, client } = createDb(
    process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  );

  try {
    await createChatWorkspacePort(db).link({
      teamspaceId: TEAMSPACE,
      accountId: null,
      platform: "slack",
      workspaceKey: EMULATE_SLACK_TEAM_ID,
      name: "SSOTA Dev",
    });

    const group = await ensureEmulateSlackMentionTrigger(
      TEAMSPACE,
      RESEARCH,
      "Research",
    );
    console.log("group", group);

    const event = await buildSlackMessageEvent({
      text: `Need help <!subteam^${group.id}|@${group.handle}> summary`,
    });
    console.log("event ts", event.event.ts);

    const started = Date.now();
    const res = await postSlackWebhook(WEB, event);
    console.log("webhook", res.status, await res.text(), `${Date.now() - started}ms`);

    const msgs = await waitForEmulateSlackBotReply({
      threadTs: event.event.ts,
      timeoutMs: 60_000,
    });
    console.log("bot reply", msgs.at(-1)?.text);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
