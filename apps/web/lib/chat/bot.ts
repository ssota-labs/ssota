import { Chat } from "chat";
import { createSlackAdapter } from "@chat-adapter/slack";
import { createDiscordAdapter } from "@chat-adapter/discord";
import { createTelegramAdapter } from "@chat-adapter/telegram";
import { createMigrationBackedPostgresState } from "./postgres-state";
import {
  createVercelConnectProvider,
  createVercelOidcVerifier,
  type UIMessageChunk,
} from "@ssota/agent-runtime";
import { start } from "workflow/api";
import {
  createModelCallToUIChunkTransform,
  type ModelCallStreamPart,
} from "@ai-sdk/workflow";
import { runMainWorkflowAgent } from "@/app/workflows/main-workflow-agent";
import { getSiteUrl } from "@/lib/auth/config";
import { extractWorkspaceKey, resolveChatTarget } from "./resolve-account";

function notLinkedReply(): string {
  return (
    "I'm not connected to a project yet. An admin can connect this workspace " +
    `from a project's Connections page in SSOTA (${getSiteUrl()}) — pick the ` +
    "project, then Connect → Slack/Discord. After that, @mention me here again."
  );
}

function slackAdapter() {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  // The bot's Slack transport token (used to receive + post messages) defaults
  // to Vercel Connect: it is resolved per Slack installation from Connect. This
  // is independent of the agent's Composio connector tools. Escape hatches:
  //   - SLACK_BOT_TOKEN forces a single static bot token (single-workspace dev).
  //   - SLACK_CONNECT=0 disables Connect (falls back to static/signing-secret).
  //   - SLACK_CONNECT_CONNECTOR overrides the Connect connector uid (default "slack").
  const staticToken = process.env.SLACK_BOT_TOKEN;
  const connectDisabled =
    process.env.SLACK_CONNECT === "0" || Boolean(staticToken);

  if (!connectDisabled) {
    const connector = process.env.SLACK_CONNECT_CONNECTOR ?? "slack";
    const provider = createVercelConnectProvider();
    const teamspaceId = process.env.CHAT_PROJECT_ID ?? "";
    const useIntake = process.env.SLACK_CONNECT_INTAKE !== "0";
    return createSlackAdapter({
      ...(useIntake
        ? { webhookVerifier: createVercelOidcVerifier() }
        : { signingSecret }),
      clientId: process.env.SLACK_CLIENT_ID,
      clientSecret: process.env.SLACK_CLIENT_SECRET,
      installationProvider: {
        getInstallation: async (installationId: string) => {
          const cred = await provider.getToken(connector, {
            teamspaceId,
            installationId,
          });
          return cred ? { botToken: cred.token } : null;
        },
      },
    });
  }

  if (staticToken) {
    return createSlackAdapter({ signingSecret, botToken: staticToken });
  }

  return createSlackAdapter({ signingSecret });
}

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
  threadId?: string;
}

async function runAgentStream(message: IncomingMessage) {
  const workspaceKey = extractWorkspaceKey(message.raw);
  const target = await resolveChatTarget(workspaceKey);
  if (!target) {
    return notLinkedReply();
  }
  const { teamspaceId, accountId } = target;
  const text = message.text;
  const threadId = message.threadId ?? `chat:${workspaceKey}`;

  const run = await start(runMainWorkflowAgent, [
    {
      teamspaceId,
      threadId,
      accountId,
      chatContext: {
        chat: {
          messages: [{ role: "user", content: text }],
        },
        channel: "chat",
        workspace: workspaceKey,
        user: message.author?.userId,
      },
    },
  ]);

  const readable = run.getReadable() as ReadableStream<ModelCallStreamPart>;
  return uiChunksToText(
    readable.pipeThrough(
      createModelCallToUIChunkTransform(),
    ) as ReadableStream<UIMessageChunk>,
  );
}

let cached: Chat | undefined;

export function getBot(): Chat {
  if (!cached) {
    const bot = new Chat({
      userName: process.env.CHAT_BOT_NAME ?? "ssota",
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

    bot.onNewMention(async (thread, message) => {
      await thread.subscribe();
      await thread.post(
        await runAgentStream({
          ...message,
          threadId: thread.id,
        }),
      );
    });

    bot.onSubscribedMessage(async (thread, message) => {
      await thread.post(
        await runAgentStream({
          ...message,
          threadId: thread.id,
        }),
      );
    });

    cached = bot;
  }
  return cached;
}
