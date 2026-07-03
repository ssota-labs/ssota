import { createHash, createHmac } from "node:crypto";
import { createDb, createAgentDefinitionPort } from "@ssota/adapter-postgres";
import { getAgentDefinitionById } from "@ssota/contracts/agents";

export const EMULATE_SLACK_TEAM_ID = "T000000001";
export const EMULATE_SLACK_CHANNEL_ID = "C000000001";
export const EMULATE_SLACK_BOT_TOKEN = "xoxb-local-test";
export const EMULATE_SLACK_SIGNING_SECRET = "ssota-emulate-test-secret";

function slackHandleFromAgentName(name: string): string {
  const handle = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 21);
  return handle || "ssota-agent";
}

/** Mirrors agent-runtime emulate stub for assertions in E2E. */
export function emulateSlackUserGroupForAgent(agentName: string) {
  const handle = slackHandleFromAgentName(agentName);
  const compact = handle.replace(/-/g, "").toUpperCase().slice(0, 8).padEnd(8, "0");
  return { id: `S0${compact}`, handle };
}

/** Idempotent DB setup so webhook routing works even if UI save is flaky. */
export async function ensureEmulateSlackMentionTrigger(
  teamspaceId: string,
  agentDefinitionId: string,
  agentName: string,
): Promise<{ id: string; handle: string }> {
  const group = emulateSlackUserGroupForAgent(agentName);
  const databaseUrl =
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
  const { db, client } = createDb(databaseUrl);
  try {
    const builtin = getAgentDefinitionById(agentDefinitionId);
    const port = createAgentDefinitionPort(db, { teamspaceId });
    const existing = await port.getById(agentDefinitionId);
    const runPolicy = {
      ...(existing?.runPolicy ?? builtin?.runPolicy ?? {}),
      allowedTriggers: [
        ...new Set([
          ...(existing?.runPolicy?.allowedTriggers ??
            builtin?.runPolicy?.allowedTriggers ??
            []),
          "task",
          "manual",
          "chat",
          "chatbot",
        ]),
      ],
      connectionTriggers: [
        {
          id: "slack:agent_mentioned",
          provider: "slack",
          kind: "agent_mentioned",
          label: "Slack agent mention",
          enabled: true,
          showTypingIndicator: true,
          slackUserGroupId: group.id,
          slackUserGroupHandle: group.handle,
        },
      ],
    };
    await port.upsertDefinition({
      id: agentDefinitionId,
      name: existing?.name ?? builtin?.title ?? agentName,
      description: existing?.description ?? builtin?.description ?? "",
      instructions: existing?.instructions ?? [],
      toolBundles: existing?.toolBundles ?? builtin?.toolBundles ?? [],
      runPolicy,
    });
    return group;
  } finally {
    await client.end();
  }
}

export function emulateSlackApiUrl(path: string): string {
  const base =
    process.env.EMULATE_SLACK_URL?.replace(/\/$/, "") ??
    "http://127.0.0.1:4003";
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

let cachedHumanUserId: string | undefined;

/** Human Slack user id for inbound webhook events (must differ from bot user). */
export async function getEmulateSlackHumanUserId(): Promise<string> {
  if (cachedHumanUserId) return cachedHumanUserId;

  const auth = await fetch(emulateSlackApiUrl("/api/auth.test"), {
    method: "POST",
    headers: { Authorization: `Bearer ${EMULATE_SLACK_BOT_TOKEN}` },
  });
  const authData = (await auth.json()) as { user_id?: string };
  const botUserId = authData.user_id;

  const users = await fetch(emulateSlackApiUrl("/api/users.list"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${EMULATE_SLACK_BOT_TOKEN}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({}),
  });
  const usersData = (await users.json()) as {
    members?: Array<{ id: string; name?: string; is_bot?: boolean }>;
  };

  const smoke = usersData.members?.find((member) => member.name === "smoke");
  const admin = usersData.members?.find((member) => member.name === "admin");
  const candidates = [smoke, admin, ...(usersData.members ?? [])].filter(
    (member): member is NonNullable<typeof member> => Boolean(member),
  );

  for (const member of candidates) {
    if (member.is_bot || member.id === botUserId) continue;
    const infoRes = await fetch(emulateSlackApiUrl("/api/users.info"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${EMULATE_SLACK_BOT_TOKEN}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ user: member.id }),
    });
    const infoData = (await infoRes.json()) as { ok?: boolean };
    if (infoData.ok) {
      cachedHumanUserId = member.id;
      return cachedHumanUserId;
    }
  }

  const human = usersData.members?.find(
    (member) => !member.is_bot && member.id !== botUserId,
  );
  cachedHumanUserId = human?.id ?? "U000000001";
  return cachedHumanUserId;
}

export function signSlackWebhook(
  body: string,
  signingSecret = EMULATE_SLACK_SIGNING_SECRET,
) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = `v0=${createHmac("sha256", signingSecret)
    .update(`v0:${timestamp}:${body}`)
    .digest("hex")}`;
  return { timestamp, signature };
}

export async function buildSlackMessageEvent(input: {
  text: string;
  channel?: string;
  teamId?: string;
  userId?: string;
  ts?: string;
}) {
  const ts = input.ts ?? (Date.now() / 1000).toFixed(6);
  const userId = input.userId ?? (await getEmulateSlackHumanUserId());
  const teamId = input.teamId ?? EMULATE_SLACK_TEAM_ID;
  return {
    type: "event_callback",
    team_id: teamId,
    event: {
      type: "message",
      channel: input.channel ?? EMULATE_SLACK_CHANNEL_ID,
      user: userId,
      text: input.text,
      ts,
      event_ts: ts,
      channel_type: "channel",
      team: teamId,
    },
    event_id: `Ev${createHash("sha256").update(ts).digest("hex").slice(0, 10)}`,
    event_time: Math.floor(Number(ts)),
  };
}

export async function postSlackWebhook(
  webUrl: string,
  payload: Record<string, unknown>,
  signingSecret = EMULATE_SLACK_SIGNING_SECRET,
): Promise<Response> {
  const body = JSON.stringify(payload);
  const { timestamp, signature } = signSlackWebhook(body, signingSecret);
  return fetch(`${webUrl.replace(/\/$/, "")}/api/chat/slack`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-slack-request-timestamp": timestamp,
      "x-slack-signature": signature,
    },
    body,
  });
}

type SlackHistoryMessage = {
  text?: string;
  bot_id?: string;
  user?: string;
  ts?: string;
};

function isEmulateBotMessage(
  message: SlackHistoryMessage,
  botUserId: string | undefined,
  humanUserId: string | undefined,
): boolean {
  const text = (message.text ?? "").trim();
  if (!text) return false;
  if (message.bot_id) return true;
  if (botUserId && message.user === botUserId) return true;
  if (humanUserId && message.user === humanUserId) return false;
  return true;
}

async function fetchEmulateSlackThreadReplies(
  channelId: string,
  threadTs: string,
  token: string,
): Promise<SlackHistoryMessage[]> {
  const response = await fetch(emulateSlackApiUrl("/api/conversations.replies"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({ channel: channelId, ts: threadTs, limit: 20 }),
  });
  const data = (await response.json()) as {
    ok?: boolean;
    messages?: SlackHistoryMessage[];
  };
  return data.messages ?? [];
}

export async function waitForEmulateSlackBotReply(
  input: {
    channelId?: string;
    token?: string;
    timeoutMs?: number;
    excludeUserId?: string;
    /** Parent message ts — Chat SDK posts bot replies in-thread via thread_ts. */
    threadTs?: string;
    predicate?: (messages: SlackHistoryMessage[]) => boolean;
  } = {},
): Promise<SlackHistoryMessage[]> {
  const channelId = input.channelId ?? EMULATE_SLACK_CHANNEL_ID;
  const token = input.token ?? EMULATE_SLACK_BOT_TOKEN;
  const timeoutMs = input.timeoutMs ?? 90_000;
  const deadline = Date.now() + timeoutMs;

  const auth = await fetch(emulateSlackApiUrl("/api/auth.test"), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const authData = (await auth.json()) as { user_id?: string; bot_id?: string };
  const botUserId = authData.user_id;
  const humanUserId =
    input.excludeUserId ?? (await getEmulateSlackHumanUserId());

  const selectBotMessages = (messages: SlackHistoryMessage[]) => {
    const botMessages = messages.filter((message) =>
      isEmulateBotMessage(message, botUserId, humanUserId),
    );
    if (botMessages.length === 0) return [];
    if (input.predicate) {
      return input.predicate(botMessages) ? botMessages : [];
    }
    return botMessages;
  };

  while (Date.now() < deadline) {
    if (input.threadTs) {
      const threadMessages = await fetchEmulateSlackThreadReplies(
        channelId,
        input.threadTs,
        token,
      );
      const botReplies = selectBotMessages(threadMessages);
      if (botReplies.length > 0) return botReplies;
    }

    const response = await fetch(emulateSlackApiUrl("/api/conversations.history"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ channel: channelId, limit: 20 }),
    });
    const data = (await response.json()) as {
      ok?: boolean;
      messages?: Array<
        SlackHistoryMessage & { reply_count?: number; ts?: string }
      >;
    };
    const messages = data.messages ?? [];

    const topLevel = selectBotMessages(messages);
    if (topLevel.length > 0) return topLevel;

    for (const parent of messages) {
      if (!parent.reply_count || !parent.ts) continue;
      const threadMessages = await fetchEmulateSlackThreadReplies(
        channelId,
        parent.ts,
        token,
      );
      const botReplies = selectBotMessages(threadMessages);
      if (botReplies.length > 0) return botReplies;
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error("Timed out waiting for emulate Slack bot reply");
}
