import { Chat } from "chat";
import { createSlackAdapter } from "@chat-adapter/slack";
import { createPostgresState } from "@chat-adapter/state-pg";
import { start } from "workflow/api";
import { spawnTask } from "@ssota/core";
import {
  createVercelConnectProvider,
  getGraphReadPort,
  getTaskPort,
  type UIMessageChunk,
} from "@ssota/agent-runtime";
import { runSsotaAgentWorkflow } from "@/app/workflows/ssota-agent";

/**
 * Chat SDK bot (chat-sdk.dev) — the inbound/outbound chat channel. A Slack
 * @mention runs the SSOTA agent through the durable workflow and streams the
 * reply back into the thread. State (subscriptions/dedupe/locks) is persisted
 * in our Postgres (createPostgresState defaults to DATABASE_URL).
 *
 * Token modes:
 *  - single workspace: SLACK_BOT_TOKEN + SLACK_SIGNING_SECRET
 *  - multi workspace via Vercel Connect: SLACK_CONNECT_CONNECTOR (+ clientId/
 *    secret) — installationProvider resolves each workspace's bot token from
 *    Connect by team id. This is the Connect↔Chat integration.
 */
function slackAdapter() {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  const botToken = process.env.SLACK_BOT_TOKEN;
  if (botToken) {
    return createSlackAdapter({ signingSecret, botToken });
  }

  const connector = process.env.SLACK_CONNECT_CONNECTOR;
  if (connector) {
    const provider = createVercelConnectProvider();
    const projectId = process.env.CHAT_PROJECT_ID ?? "";
    return createSlackAdapter({
      signingSecret,
      clientId: process.env.SLACK_CLIENT_ID,
      clientSecret: process.env.SLACK_CLIENT_SECRET,
      installationProvider: {
        // installationId is the Slack team (or enterprise) id.
        getInstallation: async (installationId: string) => {
          const cred = await provider.getToken(connector, {
            projectId,
            accountId: installationId,
          });
          return cred ? { botToken: cred.token } : null;
        },
      },
    });
  }

  // No token configured — adapter builds but webhook calls will fail until set.
  return createSlackAdapter({ signingSecret });
}

/** Convert the workflow's UI message chunk stream into a plain text stream. */
async function* uiChunksToText(
  readable: ReadableStream<UIMessageChunk>,
): AsyncIterable<string> {
  const reader = readable.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = value as { type?: string; delta?: string } | undefined;
      if (chunk?.type === "text-delta" && typeof chunk.delta === "string") {
        yield chunk.delta;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

async function runAgentStream(text: string, author?: string) {
  const projectId = process.env.CHAT_PROJECT_ID;
  if (!projectId) {
    return "The agent is not configured for chat (set CHAT_PROJECT_ID).";
  }
  // Per-workspace tenant scoping (account) is a follow-up; default to the
  // configured account or shared/builder scope.
  const accountId = process.env.CHAT_DEFAULT_ACCOUNT_ID || undefined;

  const task = await spawnTask(
    {
      tasks: getTaskPort(projectId, accountId),
      graphRead: getGraphReadPort(projectId, accountId),
    },
    projectId,
    {
      title: text.slice(0, 120),
      workflowKey: "agent.main",
      executorType: "Agent",
      context: { channel: "slack", user: author, message: text },
    },
  );

  const run = await start(runSsotaAgentWorkflow, [
    { projectId, taskId: task.id, accountId },
  ]);

  return uiChunksToText(run.getReadable() as ReadableStream<UIMessageChunk>);
}

let cached: Chat | undefined;

/** Lazily-built singleton bot. */
export function getBot(): Chat {
  if (!cached) {
    const bot = new Chat({
      userName: process.env.CHAT_BOT_NAME ?? "ssota",
      adapters: { slack: slackAdapter() },
      state: createPostgresState({ url: process.env.DATABASE_URL }),
      dedupeTtlMs: 600_000,
    });

    // @mention in a new thread → subscribe + stream the agent's reply.
    bot.onNewMention(async (thread, message) => {
      await thread.subscribe();
      await thread.post(await runAgentStream(message.text, message.author?.userId));
    });

    // Follow-up messages in a subscribed thread → keep the conversation going.
    bot.onSubscribedMessage(async (thread, message) => {
      await thread.post(await runAgentStream(message.text, message.author?.userId));
    });

    cached = bot;
  }
  return cached;
}
