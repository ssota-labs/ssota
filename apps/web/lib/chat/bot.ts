import { Chat } from "chat";
import { createSlackAdapter } from "@chat-adapter/slack";
import { createDiscordAdapter } from "@chat-adapter/discord";
import { createTelegramAdapter } from "@chat-adapter/telegram";
import { createMigrationBackedPostgresState } from "./postgres-state";
import { start } from "workflow/api";
import { spawnTask } from "@ssota/core";
import {
  createVercelConnectProvider,
  createVercelOidcVerifier,
  getGraphReadPort,
  getTaskPort,
  type UIMessageChunk,
} from "@ssota/agent-runtime";
import { runSsotaAgentWorkflow } from "@/app/workflows/ssota-agent";
import { getSiteUrl } from "@/lib/auth/config";
import { extractWorkspaceKey, resolveChatTarget } from "./resolve-account";

/**
 * Reply for a message from a workspace we don't have a project link for yet.
 * Auto-linking happens when an admin connects the workspace from a project's
 * Connections page (Connect → Slack/Discord), so we point there rather than
 * asking anyone to copy a workspace id by hand.
 */
function notLinkedReply(): string {
  return (
    "I'm not connected to a project yet. An admin can connect this workspace " +
    `from a project's Connections page in SSOTA (${getSiteUrl()}) — pick the ` +
    "project, then Connect → Slack/Discord. After that, @mention me here again."
  );
}

/**
 * Chat SDK bot (chat-sdk.dev) — the inbound/outbound chat channel. A Slack
 * @mention runs the SSOTA agent through the durable workflow and streams the
 * reply back into the thread. State (subscriptions/dedupe/locks) is persisted
 * in our Postgres (`supabase/migrations` DDL; no runtime ensureSchema).
 *
 * Token modes:
 *  - single workspace: SLACK_BOT_TOKEN + SLACK_SIGNING_SECRET
 *  - multi workspace via Vercel Connect: SLACK_CONNECT_CONNECTOR (+ clientId/
 *    secret) — installationProvider resolves each workspace's bot token from
 *    Connect by team id. This is the Connect↔Chat integration.
 *
 * Webhook verification (multi-workspace only):
 *  - default (Connect intake): Slack posts to Connect's intake, which verifies
 *    the Slack signature and forwards to us with a Vercel OIDC bearer token. We
 *    verify that token (verifyVercelOidcToken) — no SLACK_SIGNING_SECRET needed.
 *    This is the SaaS path and assumes the Slack app's Event Subscription URL is
 *    pointed at the Connect intake destination.
 *  - SLACK_CONNECT_INTAKE=0: opt out and fall back to Slack HMAC via
 *    SLACK_SIGNING_SECRET (Slack posts to us directly).
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
    // Connect intake (default): verify the forwarded request via Vercel OIDC.
    // webhookVerifier takes precedence over signingSecret in the adapter, so we
    // omit the secret. Set SLACK_CONNECT_INTAKE=0 to fall back to Slack HMAC.
    const useIntake = process.env.SLACK_CONNECT_INTAKE !== "0";
    return createSlackAdapter({
      ...(useIntake
        ? { webhookVerifier: createVercelOidcVerifier() }
        : { signingSecret }),
      clientId: process.env.SLACK_CLIENT_ID,
      clientSecret: process.env.SLACK_CLIENT_SECRET,
      installationProvider: {
        // installationId is the Slack team (or enterprise) id.
        getInstallation: async (installationId: string) => {
          const cred = await provider.getToken(connector, {
            projectId,
            installationId,
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

interface IncomingMessage {
  text: string;
  author?: { userId?: string };
  raw?: unknown;
}

async function runAgentStream(message: IncomingMessage) {
  // Route the message to the project (+ account) this workspace is linked to.
  // The workspace key comes from the platform's raw payload (Slack team,
  // Discord guild, Telegram chat).
  const workspaceKey = extractWorkspaceKey(message.raw);
  const target = await resolveChatTarget(workspaceKey);
  if (!target) {
    return notLinkedReply();
  }
  const { projectId, accountId } = target;
  const text = message.text;

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
      context: {
        channel: "chat",
        workspace: workspaceKey,
        user: message.author?.userId,
        message: text,
      },
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
      // Single-token platforms (Discord/Telegram) register when their bot token
      // is set — one token, joined to many servers/chats; no per-workspace OAuth
      // or Connect. Slack (per-workspace token) is always registered.
      adapters: {
        slack: slackAdapter(),
        ...(process.env.DISCORD_BOT_TOKEN
          ? { discord: createDiscordAdapter() }
          : {}),
        ...(process.env.TELEGRAM_BOT_TOKEN
          ? { telegram: createTelegramAdapter() }
          : {}),
      },
      state: createMigrationBackedPostgresState({
        url: process.env.DATABASE_URL,
      }),
      dedupeTtlMs: 600_000,
    });

    // @mention in a new thread → subscribe + stream the agent's reply.
    bot.onNewMention(async (thread, message) => {
      await thread.subscribe();
      await thread.post(await runAgentStream(message));
    });

    // Follow-up messages in a subscribed thread → keep the conversation going.
    bot.onSubscribedMessage(async (thread, message) => {
      await thread.post(await runAgentStream(message));
    });

    cached = bot;
  }
  return cached;
}
