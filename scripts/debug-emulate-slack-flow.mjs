import { createHmac } from "node:crypto";
import { createDb } from "../packages/adapter-postgres/dist/index.js";
import {
  createAgentDefinitionPort,
  createChatWorkspacePort,
} from "../packages/adapter-postgres/dist/index.js";
import { getAgentDefinitionById } from "../packages/contracts/dist/agents/index.js";

const TEAM_ID = "T000000001";
const CHANNEL = "C000000001";
const RESEARCH_ID = "a0000000-0000-4000-8000-000000000004";
const SIGNING_SECRET = "ssota-emulate-test-secret";
const WEB = "http://localhost:3100";

const { db, client } = createDb(
  process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
);

try {
  const teamspaceRows = await db.execute(
    `select ts.id::text from teamspaces ts join organizations o on o.id = ts.organization_id where o.slug='ssota-labs' and ts.slug='ssota-dev' limit 1`,
  );
  const teamspaceId = teamspaceRows[0]?.id;
  console.log("teamspaceId", teamspaceId);
  if (!teamspaceId) throw new Error("teamspace not found");

  await createChatWorkspacePort(db).link({
    teamspaceId,
    accountId: null,
    platform: "slack",
    workspaceKey: TEAM_ID,
    name: "SSOTA Dev",
  });

  const builtin = getAgentDefinitionById(RESEARCH_ID);
  const port = createAgentDefinitionPort(db, { teamspaceId });
  const existing = await port.getById(RESEARCH_ID);
  const runPolicy = {
    ...(existing?.runPolicy ?? builtin?.runPolicy ?? {}),
    allowedTriggers: ["task", "manual", "chatbot"],
    connectionTriggers: [
      {
        id: "slack:agent_mentioned",
        provider: "slack",
        kind: "agent_mentioned",
        label: "Slack agent mention",
        enabled: true,
        showTypingIndicator: true,
        slackUserGroupId: "S0RESEARCH",
        slackUserGroupHandle: "research",
      },
    ],
  };
  await port.upsertDefinition({
    id: RESEARCH_ID,
    name: existing?.name ?? builtin?.title ?? "Research",
    description: existing?.description ?? builtin?.description ?? "",
    instructions: existing?.instructions ?? [],
    toolBundles: existing?.toolBundles ?? builtin?.toolBundles ?? [],
    runPolicy,
  });
  console.log("agent trigger configured");

  const usersRes = await fetch("http://127.0.0.1:4003/api/users.list", {
    method: "POST",
    headers: {
      Authorization: "Bearer xoxb-local-test",
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({}),
  });
  const usersData = await usersRes.json();
  const authRes = await fetch("http://127.0.0.1:4003/api/auth.test", {
    method: "POST",
    headers: { Authorization: "Bearer xoxb-local-test" },
  });
  const authData = await authRes.json();
  const botUserId = authData.user_id;
  const human =
    usersData.members?.find((m) => !m.is_bot && m.id !== botUserId) ??
    usersData.members?.[0];
  console.log("human user", human?.id, human?.name);

  const text = "Need help <!subteam^S0RESEARCH|@research> with a quick summary";
  const ts = `${Date.now() / 1000}`;
  const payload = {
    type: "event_callback",
    team_id: TEAM_ID,
    event: {
      type: "message",
      channel: CHANNEL,
      user: human?.id ?? "U000000001",
      text,
      ts,
      event_ts: ts,
      channel_type: "channel",
      team: TEAM_ID,
    },
    event_id: `Ev${Date.now()}`,
    event_time: Math.floor(Number(ts)),
  };
  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = `v0=${createHmac("sha256", SIGNING_SECRET)
    .update(`v0:${timestamp}:${body}`)
    .digest("hex")}`;

  const started = Date.now();
  const res = await fetch(`${WEB}/api/chat/slack`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-slack-request-timestamp": timestamp,
      "x-slack-signature": signature,
    },
    body,
  });
  const elapsed = Date.now() - started;
  console.log("webhook", res.status, await res.text(), `(${elapsed}ms)`);

  await new Promise((r) => setTimeout(r, 5000));

  const replies = await fetch("http://127.0.0.1:4003/api/conversations.replies", {
    method: "POST",
    headers: {
      Authorization: "Bearer xoxb-local-test",
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({ channel: CHANNEL, ts, limit: 20 }),
  });
  console.log("thread replies", JSON.stringify(await replies.json(), null, 2));

  const runs = await db.execute(
    `select id::text, status, trigger, agent_definition_id::text, started_at from agent_runs order by started_at desc limit 3`,
  );
  console.log("recent agent_runs", runs);
} finally {
  await client.end();
}
